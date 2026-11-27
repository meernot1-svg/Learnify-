import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  type Firestore,
  type FirestoreSettings,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OperationType, handleFirestoreError } from '../lib/firebase';
import type {
  SavedQuiz,
  QuizQuestionItem,
  CreateSavedQuizInput,
  UpdateSavedQuizInput,
  LabResult,
  LabSubject,
  CreateLabResultInput,
  UpdateLabResultInput,
} from '../types';

const READ_TIMEOUT = 8000;
const WRITE_TIMEOUT = 8000;
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const VALID_LAB_SUBJECTS: readonly LabSubject[] = [
  'chemistry',
  'physics',
  'biology',
  'computer',
  'math',
  'electrical',
];

/**
 * Initializes the Firebase app (reusing any existing default app instance)
 * and binds Cloud Firestore to the configured named database ID.
 */
export function initializeLearningFirestore(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
} {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  let db: Firestore;
  if (typeof window !== 'undefined') {
    try {
      db = initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
          experimentalLongPollingOptions: { timeoutSeconds: 20 },
          useFetchStreams: false,
        } as FirestoreSettings,
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  } else {
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  const auth = getAuth(app);
  return { app, db, auth };
}

export const { app: learningFirebaseApp, db: learningDb, auth: learningAuth } =
  initializeLearningFirestore();

export async function verifyLearningFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(learningDb, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore connection offline. Please check your Firebase configuration.');
    }
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`Firestore operation timed out (${timeoutMs}ms)`));
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

function requireSignedInUid(): string {
  const uid = learningAuth.currentUser?.uid;
  if (!uid) {
    throw new Error('Authentication required. Please sign in to access saved learning data.');
  }
  return uid;
}

function generateRecordId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`.slice(0, 128);
}

function assertValidId(id: string, label: string): string {
  const cleaned = id.trim();
  if (!VALID_ID_REGEX.test(cleaned)) {
    throw new Error(`Invalid ${label} identifier.`);
  }
  return cleaned;
}

function sanitizeQuestions(items: QuizQuestionItem[]): QuizQuestionItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one question is required to save a quiz.');
  }

  return items.slice(0, 100).map((item) => {
    const cleanOptions = Array.isArray(item.options)
      ? item.options.slice(0, 8).map((opt) => String(opt ?? '').trim().slice(0, 300))
      : [];

    const maxIdx = Math.max(0, cleanOptions.length - 1);
    const correctIndex = Math.min(maxIdx, Math.max(0, Math.round(Number(item.correctIndex) || 0)));

    const sanitized: QuizQuestionItem = {
      question: String(item.question ?? '').trim().slice(0, 500) || 'Untitled question',
      options: cleanOptions,
      correctIndex,
    };

    if (typeof item.selectedIndex === 'number' && Number.isFinite(item.selectedIndex)) {
      sanitized.selectedIndex = Math.min(maxIdx, Math.max(0, Math.round(item.selectedIndex)));
    }
    if (typeof item.explanation === 'string' && item.explanation.trim()) {
      sanitized.explanation = item.explanation.trim().slice(0, 600);
    }

    return sanitized;
  });
}

function getTimestampSeconds(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const sec = (value as { seconds?: unknown }).seconds;
    return typeof sec === 'number' ? sec : 0;
  }
  if (value instanceof Date) {
    return Math.floor(value.getTime() / 1000);
  }
  return 0;
}

export const learningDataService = {
  // =========================================================================
  // SAVED QUIZZES CRUD (/savedQuizzes/{quizId})
  // =========================================================================

  async createSavedQuiz(input: CreateSavedQuizInput): Promise<SavedQuiz> {
    const uid = requireSignedInUid();
    const quizId = generateRecordId('quiz');
    const path = `savedQuizzes/${quizId}`;

    const sanitizedQuestions = sanitizeQuestions(input.questions);
    const totalQuestions = Math.min(
      100,
      Math.max(1, Math.round(input.totalQuestions ?? sanitizedQuestions.length))
    );
    const score = Math.min(totalQuestions, Math.max(0, Math.round(Number(input.score) || 0)));
    const timeSpentSeconds = Math.min(
      86400,
      Math.max(0, Math.round(Number(input.timeSpentSeconds) || 0))
    );
    const title = String(input.title ?? '').trim().slice(0, 120) || 'Untitled Quiz';
    const subject = String(input.subject ?? 'general').trim().slice(0, 60) || 'general';
    const notes = String(input.notes ?? '').trim().slice(0, 1000);

    const payload = {
      id: quizId,
      userId: uid,
      title,
      subject,
      questions: sanitizedQuestions,
      score,
      totalQuestions,
      timeSpentSeconds,
      isExamMode: Boolean(input.isExamMode),
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await withTimeout(setDoc(doc(learningDb, 'savedQuizzes', quizId), payload), WRITE_TIMEOUT);
      const nowSec = Math.floor(Date.now() / 1000);
      return {
        ...payload,
        createdAt: { seconds: nowSec, nanoseconds: 0 },
        updatedAt: { seconds: nowSec, nanoseconds: 0 },
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getSavedQuizzes(userId?: string): Promise<SavedQuiz[]> {
    const targetUid = userId ? assertValidId(userId, 'user') : requireSignedInUid();
    const path = 'savedQuizzes';

    try {
      const q = query(collection(learningDb, 'savedQuizzes'), where('userId', '==', targetUid));
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedQuiz));
      return items.sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getSavedQuizById(quizId: string): Promise<SavedQuiz | null> {
    requireSignedInUid();
    const validId = assertValidId(quizId, 'quiz');
    const path = `savedQuizzes/${validId}`;

    try {
      const snap = await withTimeout(getDoc(doc(learningDb, 'savedQuizzes', validId)), READ_TIMEOUT);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as SavedQuiz;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async updateSavedQuiz(quizId: string, updates: UpdateSavedQuizInput): Promise<void> {
    requireSignedInUid();
    const validId = assertValidId(quizId, 'quiz');
    const path = `savedQuizzes/${validId}`;
    const docRef = doc(learningDb, 'savedQuizzes', validId);

    const patch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof updates.title === 'string') {
      const cleanedTitle = updates.title.trim().slice(0, 120);
      if (!cleanedTitle) throw new Error('Quiz title cannot be empty.');
      patch.title = cleanedTitle;
    }
    if (typeof updates.subject === 'string') {
      const cleanedSubject = updates.subject.trim().slice(0, 60);
      if (!cleanedSubject) throw new Error('Quiz subject cannot be empty.');
      patch.subject = cleanedSubject;
    }
    if (typeof updates.notes === 'string') {
      patch.notes = updates.notes.trim().slice(0, 1000);
    }
    if (typeof updates.timeSpentSeconds === 'number' && Number.isFinite(updates.timeSpentSeconds)) {
      patch.timeSpentSeconds = Math.min(86400, Math.max(0, Math.round(updates.timeSpentSeconds)));
    }
    if (Array.isArray(updates.questions)) {
      patch.questions = sanitizeQuestions(updates.questions);
    }
    if (typeof updates.score === 'number' && Number.isFinite(updates.score)) {
      patch.score = Math.min(50, Math.max(0, Math.round(updates.score)));
    }

    try {
      await withTimeout(updateDoc(docRef, patch), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteSavedQuiz(quizId: string): Promise<void> {
    requireSignedInUid();
    const validId = assertValidId(quizId, 'quiz');
    const path = `savedQuizzes/${validId}`;

    try {
      await withTimeout(deleteDoc(doc(learningDb, 'savedQuizzes', validId)), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // =========================================================================
  // LAB RESULTS CRUD (/labResults/{resultId})
  // =========================================================================

  async createLabResult(input: CreateLabResultInput): Promise<LabResult> {
    const uid = requireSignedInUid();
    const resultId = generateRecordId('lab');
    const path = `labResults/${resultId}`;

    if (!VALID_LAB_SUBJECTS.includes(input.subject)) {
      throw new Error('Invalid lab subject selected.');
    }

    const experimentTitle =
      String(input.experimentTitle ?? '').trim().slice(0, 120) || 'Virtual Lab Observation';
    const outcome = String(input.outcome ?? '').trim().slice(0, 1000);
    if (!outcome) {
      throw new Error('Lab outcome is required.');
    }

    const payload = {
      id: resultId,
      userId: uid,
      experimentTitle,
      subject: input.subject,
      outcome,
      formula: String(input.formula ?? '').trim().slice(0, 200),
      measurements: String(input.measurements ?? '').trim().slice(0, 1000),
      notes: String(input.notes ?? '').trim().slice(0, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await withTimeout(setDoc(doc(learningDb, 'labResults', resultId), payload), WRITE_TIMEOUT);
      const nowSec = Math.floor(Date.now() / 1000);
      return {
        ...payload,
        createdAt: { seconds: nowSec, nanoseconds: 0 },
        updatedAt: { seconds: nowSec, nanoseconds: 0 },
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getLabResults(userId?: string, subject?: LabSubject): Promise<LabResult[]> {
    const targetUid = userId ? assertValidId(userId, 'user') : requireSignedInUid();
    const path = 'labResults';

    try {
      const q = query(collection(learningDb, 'labResults'), where('userId', '==', targetUid));
      const snap = await withTimeout(getDocs(q), READ_TIMEOUT);
      let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LabResult));
      if (subject) {
        items = items.filter((item) => item.subject === subject);
      }
      return items.sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getLabResultById(resultId: string): Promise<LabResult | null> {
    requireSignedInUid();
    const validId = assertValidId(resultId, 'lab result');
    const path = `labResults/${validId}`;

    try {
      const snap = await withTimeout(getDoc(doc(learningDb, 'labResults', validId)), READ_TIMEOUT);
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() } as LabResult;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async updateLabResult(resultId: string, updates: UpdateLabResultInput): Promise<void> {
    requireSignedInUid();
    const validId = assertValidId(resultId, 'lab result');
    const path = `labResults/${validId}`;
    const docRef = doc(learningDb, 'labResults', validId);

    const patch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof updates.experimentTitle === 'string') {
      const cleanedTitle = updates.experimentTitle.trim().slice(0, 120);
      if (!cleanedTitle) throw new Error('Experiment title cannot be empty.');
      patch.experimentTitle = cleanedTitle;
    }
    if (updates.subject !== undefined) {
      if (!VALID_LAB_SUBJECTS.includes(updates.subject)) {
        throw new Error('Invalid lab subject.');
      }
      patch.subject = updates.subject;
    }
    if (typeof updates.outcome === 'string') {
      const cleanedOutcome = updates.outcome.trim().slice(0, 1000);
      if (!cleanedOutcome) throw new Error('Lab outcome cannot be empty.');
      patch.outcome = cleanedOutcome;
    }
    if (typeof updates.formula === 'string') {
      patch.formula = updates.formula.trim().slice(0, 200);
    }
    if (typeof updates.measurements === 'string') {
      patch.measurements = updates.measurements.trim().slice(0, 1000);
    }
    if (typeof updates.notes === 'string') {
      patch.notes = updates.notes.trim().slice(0, 1000);
    }

    try {
      await withTimeout(updateDoc(docRef, patch), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteLabResult(resultId: string): Promise<void> {
    requireSignedInUid();
    const validId = assertValidId(resultId, 'lab result');
    const path = `labResults/${validId}`;

    try {
      await withTimeout(deleteDoc(doc(learningDb, 'labResults', validId)), WRITE_TIMEOUT);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
};
