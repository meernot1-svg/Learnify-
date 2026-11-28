import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { UserProfile, Material, Course, Progress, Subject, StudyReminder } from '../types';

const READ_TIMEOUT = 20000;
const WRITE_TIMEOUT = 20000;
const isBrowser = typeof window !== 'undefined';

const ADMIN_EMAILS = ['meernot1@gmail.com', 'safiullahbhangar1@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const defaultMaterials: Material[] = [
  {
    id: 'mat_python_basics',
    title: 'Interactive Python Basics',
    description: 'Learn the fundamentals of Python programming including variables, control structures, and basic functions with interactive challenges.',
    subject: 'computer',
    type: 'video',
    url: 'https://www.youtube.com/embed/kqtD5dpn9C8',
    mentorId: 'mentor_sarah',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 100000, nanoseconds: 0 },
    isPrioritized: true,
  },
  {
    id: 'mat_classical_mechanics',
    title: 'Understanding Classical Mechanics',
    description: 'Deep dive into Newtonian physics, force vectors, acceleration, and planetary motion with visual coordinate mappings.',
    subject: 'physics',
    type: 'video',
    url: 'https://www.youtube.com/embed/b1t41Q3xRM8',
    mentorId: 'mentor_james',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 80000, nanoseconds: 0 },
    isPrioritized: true,
  },
  {
    id: 'mat_covalent_bonds',
    title: 'Visualizing Covalent and Ionic Bonds',
    description: 'An interactive video lesson detailing valence shell sharing, orbital overlap, electronegativity gradients, and molecular geometry.',
    subject: 'chemistry',
    type: 'video',
    url: 'https://www.youtube.com/embed/hEKe5gHPHy0',
    mentorId: 'mentor_david',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 60000, nanoseconds: 0 },
    isPrioritized: true,
  },
  {
    id: 'mat_cellular_respiration',
    title: 'Cellular Respiration and ATP Synthesis',
    description: 'A high-yield animation exploring glycolysis, the Krebs cycle, electron transport chain gradient dynamics, and ATP synthesis.',
    subject: 'biology',
    type: 'video',
    url: 'https://www.youtube.com/embed/eJ9Zjc-hyyY',
    mentorId: 'mentor_elena',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 40000, nanoseconds: 0 },
    isPrioritized: true,
  },
  {
    id: 'mat_calculus_visualized',
    title: 'Essence of Calculus & Derivatives',
    description: 'Visual intuition behind limits, instantaneous rates of change, Riemann sums, and the Fundamental Theorem of Calculus.',
    subject: 'math',
    type: 'video',
    url: 'https://www.youtube.com/embed/WUvTyaaNkzM',
    mentorId: 'mentor_ada',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 30000, nanoseconds: 0 },
    isPrioritized: true,
  },
  {
    id: 'mat_circuit_analysis',
    title: 'DC Circuits, Ohm Law & Logic Gates',
    description: 'Hands-on foundation in Kirchhoff voltage and current laws, RC time constants, AC signals, and Boolean digital logic.',
    subject: 'electrical',
    type: 'video',
    url: 'https://www.youtube.com/embed/mc979OhitAg',
    mentorId: 'mentor_tesla',
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 20000, nanoseconds: 0 },
    isPrioritized: true,
  },
];

function getLocalList<T>(key: string, defaults: T[] = []): T[] {
  if (!isBrowser) return defaults;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaults;
  } catch {
    return defaults;
  }
}

function setLocalList<T>(key: string, value: T[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Operation timed out (${timeoutMs}ms)`));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timerId);
      return res;
    }),
    timeoutPromise,
  ]);
}

function isOfflineError(error: unknown): boolean {
  if (isBrowser && !navigator.onLine) return true;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('offline') || msg.includes('timed out') || msg.includes('network');
}

export const dbService = {
  // User Profile (reads public profile + owner's private PII if permitted)
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const path = `users/${uid}`;
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', uid)), READ_TIMEOUT);
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data() as UserProfile;

      // Attempt to read private PII when viewing own profile or as admin
      if (auth.currentUser?.uid === uid || isAdminEmail(auth.currentUser?.email)) {
        try {
          const privSnap = await withTimeout(getDoc(doc(db, 'users', uid, 'private', 'info')), READ_TIMEOUT);
          if (privSnap.exists()) {
            const priv = privSnap.data();
            data.email = priv.email || data.email || '';
            data.fatherName = priv.fatherName || '';
            data.phone = priv.phone || '';
            data.address = priv.address || '';
          }
        } catch {
          // Non-fatal if private info doesn't exist yet
        }
      }

      const local = getLocalList<UserProfile>('local_users');
      setLocalList('local_users', [...local.filter((u) => u.uid !== uid), data]);
      return data;
    } catch (error) {
      if (isOfflineError(error)) {
        const local = getLocalList<UserProfile>('local_users');
        return local.find((u) => u.uid === uid) || null;
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createUserProfile(profile: UserProfile): Promise<void> {
    const path = `users/${profile.uid}`;
    const cleanFullName = (profile.fullName || '').trim().slice(0, 100) || 'Learner';
    const cleanDisplayName = (profile.displayName || cleanFullName).trim().slice(0, 100) || cleanFullName;
    const cleanUsername = (profile.username || '').trim().slice(0, 50) || `learner_${profile.uid.slice(0, 6)}`;
    const publicDoc = {
      uid: profile.uid,
      displayName: cleanDisplayName,
      username: cleanUsername,
      fullName: cleanFullName,
      role: isAdminEmail(auth.currentUser?.email) ? profile.role : 'Student',
      achievements: [],
      points: 0,
      createdAt: serverTimestamp(),
    };

    const privateDoc = {
      email: (profile.email || auth.currentUser?.email || '').slice(0, 256),
      fatherName: (profile.fatherName || '').slice(0, 100),
      phone: (profile.phone || '').slice(0, 40),
      address: (profile.address || '').slice(0, 300),
      updatedAt: serverTimestamp(),
    };

    try {
      const publicRef = doc(db, 'users', profile.uid);
      const privateRef = doc(db, 'users', profile.uid, 'private', 'info');
      const existingSnap = await withTimeout(getDoc(publicRef), READ_TIMEOUT);

      if (existingSnap.exists()) {
        await withTimeout(setDoc(privateRef, privateDoc, { merge: true }), WRITE_TIMEOUT);
        const existingData = existingSnap.data() as UserProfile;
        const mergedProfile: UserProfile = {
          ...existingData,
          email: privateDoc.email || existingData.email || '',
          fatherName: privateDoc.fatherName || existingData.fatherName || '',
          phone: privateDoc.phone || existingData.phone || '',
          address: privateDoc.address || existingData.address || '',
        };
        const local = getLocalList<UserProfile>('local_users');
        setLocalList('local_users', [...local.filter((u) => u.uid !== profile.uid), mergedProfile]);
        return;
      }

      await withTimeout(
        Promise.all([setDoc(publicRef, publicDoc), setDoc(privateRef, privateDoc)]),
        WRITE_TIMEOUT
      );

      const cachedProfile: UserProfile = {
        ...profile,
        role: publicDoc.role,
        points: 0,
        achievements: [],
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      };
      const local = getLocalList<UserProfile>('local_users');
      setLocalList('local_users', [...local.filter((u) => u.uid !== profile.uid), cachedProfile]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const path = `users/${uid}`;
    const allowedPublic: Record<string, unknown> = {};
    if (typeof data.displayName === 'string') allowedPublic.displayName = data.displayName.slice(0, 100);
    if (typeof data.username === 'string') allowedPublic.username = data.username.slice(0, 50);
    if (typeof data.fullName === 'string') allowedPublic.fullName = data.fullName.slice(0, 100);
    if (isAdminEmail(auth.currentUser?.email) && (data.role === 'Student' || data.role === 'Mentor')) {
      allowedPublic.role = data.role;
    }

    try {
      if (Object.keys(allowedPublic).length > 0) {
        await withTimeout(updateDoc(doc(db, 'users', uid), allowedPublic), WRITE_TIMEOUT);
      }

      const local = getLocalList<UserProfile>('local_users');
      const idx = local.findIndex((u) => u.uid === uid);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...allowedPublic } as UserProfile;
        setLocalList('local_users', local);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updatePoints(userId: string, pointsToAdd: number): Promise<void> {
    const path = `users/${userId}`;
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await withTimeout(getDoc(userRef), READ_TIMEOUT);
      if (!userDoc.exists()) return;

      const sData = userDoc.data();
      const sPoints = typeof sData.points === 'number' ? sData.points : 0;
      const sAchievements: string[] = Array.isArray(sData.achievements) ? sData.achievements : [];
      const finalPoints = Math.min(1000000, sPoints + pointsToAdd);

      const finalAchievements = [...sAchievements];
      const badges = [
        { name: 'Novice Ops', threshold: 100 },
        { name: 'Veteran Agent', threshold: 500 },
        { name: 'Mission Master', threshold: 1000 },
        { name: 'Tactical Genius', threshold: 2500 },
      ];

      badges.forEach((badge) => {
        if (finalPoints >= badge.threshold && !finalAchievements.includes(badge.name)) {
          finalAchievements.push(badge.name);
        }
      });

      await withTimeout(
        updateDoc(userRef, {
          points: finalPoints,
          achievements: finalAchievements.slice(0, 100),
        }),
        WRITE_TIMEOUT
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async getLeaderboard(): Promise<UserProfile[]> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'Student'));
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      const serverUsers = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
      return serverUsers.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
    } catch (error) {
      if (isOfflineError(error)) {
        const local = getLocalList<UserProfile>('local_users');
        return [...local].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // Materials
  async getMaterials(subject?: Subject): Promise<Material[]> {
    const path = 'materials';
    try {
      const col = collection(db, 'materials');
      const q = subject ? query(col, where('subject', '==', subject)) : query(col);
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      const serverMats = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Material));

      if (serverMats.length === 0) {
        // Provide curated starter video modules if no materials are published yet
        return subject ? defaultMaterials.filter((m) => m.subject === subject) : defaultMaterials;
      }

      return serverMats.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      if (isOfflineError(error)) {
        const filtered = subject ? defaultMaterials.filter((m) => m.subject === subject) : defaultMaterials;
        return filtered;
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createMaterial(material: Omit<Material, 'id' | 'createdAt' | 'mentorId'>): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('You must be signed in to publish materials.');
    if (!isValidHttpUrl(material.url)) {
      throw new Error('Material URL must start with http:// or https://');
    }

    const matId = 'mat_' + Math.random().toString(36).substring(2, 11);
    const path = `materials/${matId}`;
    const payload = {
      id: matId,
      title: material.title.trim().slice(0, 100),
      description: material.description.trim().slice(0, 1000),
      subject: material.subject,
      type: material.type,
      url: material.url.trim().slice(0, 1000),
      mentorId: uid,
      isPrioritized: Boolean(material.isPrioritized),
      createdAt: serverTimestamp(),
    };

    try {
      await withTimeout(setDoc(doc(db, 'materials', matId), payload), WRITE_TIMEOUT);
      return matId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteMaterial(id: string): Promise<void> {
    const path = `materials/${id}`;
    try {
      await withTimeout(deleteDoc(doc(db, 'materials', id)), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async purgeAllData(): Promise<void> {
    const path = 'materials';
    try {
      const mats = await withTimeout(getDocs(collection(db, 'materials')), READ_TIMEOUT);
      const courses = await withTimeout(getDocs(collection(db, 'courses')), READ_TIMEOUT);
      await withTimeout(
        Promise.all([...mats.docs.map((d) => deleteDoc(d.ref)), ...courses.docs.map((d) => deleteDoc(d.ref))]),
        WRITE_TIMEOUT
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async toggleMaterialPriority(id: string, current: boolean): Promise<void> {
    const path = `materials/${id}`;
    try {
      await withTimeout(updateDoc(doc(db, 'materials', id), { isPrioritized: !current }), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Courses
  async getCourses(subject?: Subject): Promise<Course[]> {
    const path = 'courses';
    try {
      const col = collection(db, 'courses');
      const q = subject ? query(col, where('subject', '==', subject)) : query(col);
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      const serverCourses = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
      return serverCourses.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      if (isOfflineError(error)) return [];
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createCourse(course: Omit<Course, 'id' | 'createdAt' | 'mentorId'>): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('You must be signed in to create courses.');
    const courseId = 'course_' + Math.random().toString(36).substring(2, 11);
    const path = `courses/${courseId}`;

    try {
      await withTimeout(
        setDoc(doc(db, 'courses', courseId), {
          id: courseId,
          title: course.title.trim().slice(0, 100),
          description: course.description.trim().slice(0, 1000),
          subject: course.subject,
          mentorId: uid,
          materialIds: (course.materialIds || []).slice(0, 50),
          isPrioritized: Boolean(course.isPrioritized),
          createdAt: serverTimestamp(),
        }),
        WRITE_TIMEOUT
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async awardBadge(userId: string, badge: string): Promise<void> {
    const path = `users/${userId}`;
    try {
      await withTimeout(
        updateDoc(doc(db, 'users', userId), {
          achievements: arrayUnion(badge.trim().slice(0, 80)),
        }),
        WRITE_TIMEOUT
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCourse(id: string): Promise<void> {
    const path = `courses/${id}`;
    try {
      await withTimeout(deleteDoc(doc(db, 'courses', id)), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async toggleCoursePriority(id: string, current: boolean): Promise<void> {
    const path = `courses/${id}`;
    try {
      await withTimeout(updateDoc(doc(db, 'courses', id), { isPrioritized: !current }), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Progress
  async getStudentProgress(userId: string): Promise<Progress[]> {
    const path = 'progress';
    try {
      const q = query(collection(db, 'progress'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Progress));
    } catch (error) {
      if (isOfflineError(error)) return [];
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async markComplete(userId: string, materialId: string): Promise<void> {
    const progressId = `${userId}_${materialId}`;
    const path = `progress/${progressId}`;
    try {
      const ref = doc(db, 'progress', progressId);
      const existingSnap = await withTimeout(getDoc(ref), READ_TIMEOUT);
      if (existingSnap.exists()) return;

      // Ensure referenced material exists in Firestore before creating progress
      const matSnap = await withTimeout(getDoc(doc(db, 'materials', materialId)), READ_TIMEOUT);
      if (!matSnap.exists()) {
        // Starter fallback materials aren't persisted in Firestore yet; skip DB write cleanly
        return;
      }

      await withTimeout(
        setDoc(ref, {
          userId,
          materialId,
          status: 'completed',
          updatedAt: serverTimestamp(),
        }),
        WRITE_TIMEOUT
      );
      await this.updatePoints(userId, 20);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // Student Management
  async getStudents(): Promise<UserProfile[]> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'Student'));
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
    } catch (error) {
      if (isOfflineError(error)) return [];
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // Reminders
  async getReminders(userId: string): Promise<StudyReminder[]> {
    const path = 'reminders';
    try {
      const q = query(collection(db, 'reminders'), where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      const serverReminders = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          time: data.time?.seconds ? { seconds: data.time.seconds } : data.time,
        } as StudyReminder;
      });
      return serverReminders.sort((a, b) => (a.time?.seconds || 0) - (b.time?.seconds || 0));
    } catch (error) {
      if (isOfflineError(error)) return [];
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createReminder(reminder: Omit<StudyReminder, 'id' | 'createdAt' | 'userId' | 'isNotified'>): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('You must be signed in to set reminders.');
    const reminderId = 'rem_' + Math.random().toString(36).substring(2, 11);
    const path = `reminders/${reminderId}`;

    try {
      await withTimeout(
        setDoc(doc(db, 'reminders', reminderId), {
          id: reminderId,
          userId: uid,
          subject: String(reminder.subject).trim().slice(0, 100),
          topic: String(reminder.topic).trim().slice(0, 200),
          time: reminder.time instanceof Date ? reminder.time : new Date(reminder.time),
          isNotified: false,
          createdAt: serverTimestamp(),
        }),
        WRITE_TIMEOUT
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteReminder(id: string): Promise<void> {
    const path = `reminders/${id}`;
    try {
      await withTimeout(deleteDoc(doc(db, 'reminders', id)), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async markReminderNotified(id: string): Promise<void> {
    const path = `reminders/${id}`;
    try {
      await withTimeout(updateDoc(doc(db, 'reminders', id), { isNotified: true }), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
};
