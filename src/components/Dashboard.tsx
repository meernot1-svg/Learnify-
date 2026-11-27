import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Video, 
  Book as BookIcon, 
  Award, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Users, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  Trash2, 
  Star, 
  Download, 
  Play, 
  ExternalLink, 
  X as CloseIcon, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { dbService, isAdminEmail } from '../services/db';
import { storage, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Material, Course, Progress, Subject, UserProfile } from '../types';
import { cn } from '../lib/utils';
import MentorVerification from './MentorVerification';
import StudentDashboard from './StudentDashboard';
import { format } from 'date-fns';

function getSafeHttpUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const { profile, isMentorVerified, setMentorVerified } = useAuth();
  
  if (profile?.role === 'Mentor') {
    if (!isMentorVerified) return <MentorVerification onVerify={() => setMentorVerified(true)} />;
    return <MentorDashboard />;
  }
  return <StudentDashboard />;
}

function MentorDashboard() {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [showUpload, setShowUpload] = useState(false);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purging, setPurging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [studentProgress, setStudentProgress] = useState<Progress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [badgeInput, setBadgeInput] = useState('');
  const [awardingBadge, setAwardingBadge] = useState(false);
  const [promotingUid, setPromotingUid] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
  };

  useEffect(() => {
    if (!statusBanner) return;
    const timer = setTimeout(() => setStatusBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [statusBanner]);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    // Students listener filtered by role so Firestore rules allow list for all mentors & admins
    const studentsQuery = query(collection(db, 'users'), where('role', '==', 'Student'));
    const unsubStudents = onSnapshot(studentsQuery, (snap) => {
      clearTimeout(loadingTimeout);
      const studentList = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      setStudents(studentList);
      setLoading(false);

      setSelectedStudent(prev => {
        if (!prev) return null;
        return studentList.find(s => s.uid === prev.uid) || null;
      });
    }, (err) => {
      clearTimeout(loadingTimeout);
      console.error('Students Listener Error:', err);
      showStatus('error', 'Unable to load student roster. Check your mentor permissions.');
      setLoading(false);
    });

    // Materials listener
    const unsubMaterials = onSnapshot(collection(db, 'materials'), (snap) => {
      const materialList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
      setMaterials(isAdmin ? materialList : materialList.filter(m => m.mentorId === user.uid));
    }, (err) => {
      console.error('Materials Listener Error:', err);
      showStatus('error', 'Unable to sync materials catalog.');
    });

    // Courses listener
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snap) => {
      const courseList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      setCourses(isAdmin ? courseList : courseList.filter(c => c.mentorId === user.uid));
    }, (err) => {
      console.error('Courses Listener Error:', err);
      showStatus('error', 'Unable to sync courses catalog.');
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubStudents();
      unsubMaterials();
      unsubCourses();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!selectedStudent || !isAdmin) {
      setStudentProgress([]);
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);
    const q = query(collection(db, 'progress'), where('userId', '==', selectedStudent.uid));
    const unsub = onSnapshot(q, (snap) => {
      setStudentProgress(snap.docs.map(d => ({ id: d.id, ...d.data() } as Progress)));
      setProgressLoading(false);
    }, (err) => {
      console.error('Progress Listener Error:', err);
      setProgressLoading(false);
    });

    return () => unsub();
  }, [selectedStudent?.uid, isAdmin]);

  const awardBadge = async (studentId: string, badgeType: string) => {
    const cleanBadge = badgeType.trim();
    if (!cleanBadge) {
      showStatus('error', 'Enter a badge title before awarding.');
      return;
    }
    setAwardingBadge(true);
    try {
      await dbService.awardBadge(studentId, cleanBadge);
      setBadgeInput('');
      showStatus('success', `Badge "${cleanBadge}" archived to student profile.`);
    } catch (err: any) {
      showStatus('error', err?.message || 'Failed to award badge. Check mentor permissions.');
    } finally {
      setAwardingBadge(false);
    }
  };

  const handlePromoteToMentor = async (student: UserProfile) => {
    if (!isAdmin) return;
    setPromotingUid(student.uid);
    try {
      await dbService.updateUserProfile(student.uid, { role: 'Mentor' });
      setSelectedStudent(null);
      showStatus('success', `${student.displayName} promoted to Mentor.`);
    } catch (err: any) {
      showStatus('error', err?.message || 'Failed to promote user.');
    } finally {
      setPromotingUid(null);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await dbService.deleteMaterial(id);
      showStatus('success', 'Material removed from catalog.');
    } catch (err: any) {
      let msg = err?.message || 'Deletion failed.';
      try {
        const errorData = JSON.parse(err.message);
        msg = `${errorData.error} (${errorData.operationType})`;
      } catch {}
      showStatus('error', `Deletion failed: ${msg}`);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    setCourseToDelete(course);
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      await dbService.deleteCourse(courseToDelete.id);
      showStatus('success', `Course "${courseToDelete.title}" removed from system.`);
      setCourseToDelete(null);
    } catch (err: any) {
      let msg = err?.message || 'Course deletion failed.';
      try {
        const errorData = JSON.parse(err.message);
        msg = `${errorData.error} (${errorData.operationType} on ${errorData.path})`;
      } catch {}
      showStatus('error', `Course deletion failed: ${msg}`);
      setCourseToDelete(null);
    }
  };

  const handleConfirmPurge = async () => {
    setPurging(true);
    try {
      await dbService.purgeAllData();
      setConfirmPurge(false);
      showStatus('success', 'Curriculum reset complete.');
    } catch (err: any) {
      showStatus('error', err?.message || 'Purge failed.');
    } finally {
      setPurging(false);
    }
  };

  const handleTogglePriority = async (id: string, current: boolean) => {
    try {
      await dbService.toggleMaterialPriority(id, current);
    } catch (err: any) {
      showStatus('error', err?.message || 'Failed to toggle priority.');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-2xl border flex items-center justify-between gap-4 text-xs font-bold",
              statusBanner.type === 'success'
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-red-500/10 border-red-500/30 text-red-500"
            )}
          >
            <div className="flex items-center gap-3">
              {statusBanner.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{statusBanner.message}</span>
            </div>
            <button onClick={() => setStatusBanner(null)} className="p-1 hover:opacity-70">
              <CloseIcon size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl md:text-4xl font-black italic mb-1 tracking-tighter uppercase text-primary">Mentor Command</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-60">Architect of educational catalogs and student growth.</p>
        </motion.div>
        <button 
           onClick={() => setShowUpload(true)}
           className="flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-primary/20"
        >
          <Plus size={20} strokeWidth={4} />
          <span>Deploy Resource</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Active Courses" value={courses.length.toString()} icon={<BookIcon size={20} />} />
        <StatCard title="Total Students" value={students.length.toString()} icon={<Users size={20} />} />
        <StatCard title="My Resources" value={materials.length.toString()} icon={<Clock size={20} />} />
        <StatCard title="Efficiency" value="98%" icon={<TrendingUp size={20} />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <section className="space-y-10">
          <div className="bg-card border-2 md:border-4 border-border rounded-3xl sm:rounded-[3.5rem] md:rounded-[4rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
               <Users size={120} />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4">
               <Users className="text-primary" size={32} />
               Student Roster
            </h2>
            <div className="space-y-6">
              {loading ? (
                <p className="text-center py-20 text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-40">Loading students...</p>
              ) : students.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground uppercase text-[10px] font-black tracking-widest opacity-40">No students found.</p>
              ) : (
                <div className="space-y-4">
                  {students.map((student) => (
                    <div 
                      key={student.uid} 
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        "p-6 border-2 rounded-3xl flex items-center justify-between transition-all cursor-pointer",
                        selectedStudent?.uid === student.uid 
                          ? "bg-primary/5 border-primary shadow-lg" 
                          : "bg-muted/20 border-border/50 hover:bg-muted/40 hover:scale-[1.02]"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl",
                          selectedStudent?.uid === student.uid ? "bg-primary text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"
                        )}>
                          {student.displayName[0]}
                        </div>
                        <div>
                          <p className="font-black uppercase italic tracking-tight">{student.displayName}</p>
                          <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-50">
                            @{student.username} • {student.points || 0} pts
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ChevronRight className={cn(
                          "text-muted-foreground/30 transition-transform",
                          selectedStudent?.uid === student.uid && "rotate-90 text-primary"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {selectedStudent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-card border-2 md:border-4 border-border rounded-3xl sm:rounded-[3.5rem] md:rounded-[4rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden mt-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                    <Users className="text-primary" size={28} />
                    Student Intel
                  </h3>
                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="p-3 bg-muted rounded-2xl hover:bg-muted/80 transition-all font-black text-[10px] uppercase tracking-widest"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="p-5 bg-muted/20 border border-border rounded-2xl space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                      <Award size={14} className="text-primary" /> Award Specialized Badge
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={badgeInput}
                        onChange={(e) => setBadgeInput(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. Lab Distinction"
                        className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        disabled={awardingBadge || !badgeInput.trim()}
                        onClick={() => awardBadge(selectedStudent.uid, badgeInput)}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                      >
                        {awardingBadge ? 'Saving...' : 'Award'}
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground">Admin Role Control</span>
                        <button
                          type="button"
                          disabled={promotingUid === selectedStudent.uid}
                          onClick={() => handlePromoteToMentor(selectedStudent)}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                        >
                          {promotingUid === selectedStudent.uid ? 'Promoting...' : 'Promote to Mentor'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-6 flex items-center gap-2">
                       <Play size={14} /> Mission Progress
                    </h4>
                    {!isAdmin ? (
                       <p className="text-center py-6 w-full text-muted-foreground text-[10px] font-black uppercase italic tracking-widest opacity-50">
                         Detailed per-student logs are restricted to administrators.
                       </p>
                    ) : progressLoading ? (
                       <div className="text-center py-10 animate-pulse text-[10px] font-black uppercase tracking-widest opacity-30">Decrypting progress stream...</div>
                    ) : studentProgress.length === 0 ? (
                       <p className="text-center py-6 w-full text-muted-foreground text-[10px] font-black uppercase italic tracking-widest opacity-30">No missions logged in this sector.</p>
                    ) : (
                      <div className="space-y-3">
                        {studentProgress.map((p, i) => {
                          const material = materials.find(m => m.id === p.materialId);
                          return (
                            <div key={i} className="flex items-center justify-between p-4 bg-muted/10 border border-border/50 rounded-2xl">
                               <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                     <CheckCircle size={16} />
                                  </div>
                                  <span className="text-xs font-black uppercase italic tracking-tight">{material?.title || 'Unknown Asset'}</span>
                               </div>
                               <span className="text-[8px] font-bold uppercase text-muted-foreground/40">{format(p.updatedAt?.toDate?.() || new Date(), 'MMM d, HH:mm')}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="space-y-10">
          <div className="bg-card border-2 md:border-4 border-border rounded-3xl sm:rounded-[4rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:-rotate-12 transition-transform">
                <ShieldCheck size={120} />
             </div>
             <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-10 flex items-center gap-4">
                <ShieldCheck className="text-primary" size={32} />
                Course Catalog
             </h2>
             <div className="space-y-6">
               {courses.length === 0 ? (
                 <p className="text-center py-20 text-muted-foreground text-xs font-black uppercase tracking-widest opacity-40 italic">Syncing sector data...</p>
               ) : (
                 courses.map(c => (
                   <div key={c.id} className="p-8 bg-muted/20 border-4 border-border rounded-[3rem] flex items-center justify-between transition-all hover:border-primary group/card">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 rounded-[1.8rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover/card:bg-primary group-hover/card:text-primary-foreground transition-all">
                            <BookIcon size={32} />
                         </div>
                         <div>
                            <p className="text-xl font-black italic uppercase tracking-tighter mb-1">{c.title}</p>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{c.subject} Sector</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteCourse(c)}
                        className="p-4 bg-background border-2 border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 rounded-2xl transition-all shadow-lg"
                      >
                        <Trash2 size={24} />
                      </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </section>

        <section className="col-span-full space-y-10">
          <div className="bg-card border-2 md:border-4 border-border rounded-3xl sm:rounded-[4rem] md:rounded-[5rem] p-6 sm:p-16 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 scale-150">
               <BookIcon size={300} />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter mb-10 sm:mb-16 flex items-center gap-4 sm:gap-6">
               <BookIcon className="text-primary font-black" size={48} strokeWidth={3} />
               Educational Datalink
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {materials.length === 0 ? (
                <div className="col-span-full py-20 sm:py-40 text-center bg-muted/5 border-2 md:border-4 border-dashed border-border/20 rounded-3xl sm:rounded-[4rem]">
                  <p className="text-xs font-black italic uppercase text-muted-foreground tracking-[0.5em] opacity-30">Archive empty. Deploy materials to sector.</p>
                </div>
              ) : (
                materials.map(m => (
                  <div key={m.id} className="p-10 bg-muted/10 border-4 border-border rounded-[3.5rem] flex items-center justify-between transition-all hover:bg-muted/20 hover:border-primary group/item shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-8 relative z-10">
                      <div className={cn(
                        "w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all",
                        m.type === 'video' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                      )}>
                        {m.type === 'video' ? <Video size={36} /> : <BookIcon size={36} />}
                      </div>
                      <div className="min-w-0 pr-8">
                        <div className="flex items-center gap-3 mb-2">
                           <p className="text-2xl font-black italic uppercase tracking-tighter truncate">{m.title}</p>
                           {m.isPrioritized && (
                             <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                           )}
                        </div>
                        <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.3em] opacity-40">{m.subject} Core</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                      <button 
                        onClick={() => handleTogglePriority(m.id, !!m.isPrioritized)}
                        className={cn(
                          "w-16 h-16 rounded-full border-4 transition-all flex items-center justify-center bg-background shadow-xl",
                          m.isPrioritized 
                            ? "border-yellow-400 text-yellow-500" 
                            : "border-border text-muted-foreground hover:text-yellow-500"
                        )}
                      >
                        <Star size={24} fill={m.isPrioritized ? "currentColor" : "none"} strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="w-16 h-16 bg-background border-4 border-border text-muted-foreground hover:text-red-500 hover:border-red-500/30 rounded-full flex items-center justify-center transition-all shadow-xl"
                      >
                        <Trash2 size={24} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {isAdmin && (
               <div className="mt-20 pt-16 border-t-4 border-border/30">
                  <button 
                    onClick={() => setConfirmPurge(true)}
                    className="w-full py-6 bg-red-500/5 border-4 border-red-500/20 text-red-500 rounded-[3rem] font-black text-xs uppercase tracking-[0.5em] hover:bg-red-500 hover:text-white transition-all shadow-xl"
                  >
                    Emergency Core Purge
                  </button>
               </div>
            )}
          </div>
        </section>
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={(msg) => showStatus('success', msg)}
        />
      )}

      <AnimatePresence>
        {confirmPurge && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-md p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-md w-full bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl relative"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Purge Curriculum Data?</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    This will permanently delete all materials and courses across the platform.
                  </p>
                </div>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setConfirmPurge(false)}
                    disabled={purging}
                    className="flex-1 py-4 bg-muted border border-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPurge}
                    disabled={purging}
                    className="flex-1 py-4 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    {purging ? 'Purging...' : 'Confirm Purge'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="max-w-md w-full bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl relative"
            >
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Delete Course?</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    You are about to permanently delete <span className="text-foreground font-bold">"{courseToDelete.title}"</span>. 
                    This will remove the course curriculum, module associations, and tracking data for all enrolled students.
                  </p>
                </div>
                <div className="w-full p-4 bg-muted/50 rounded-2xl text-[10px] uppercase font-black tracking-widest text-muted-foreground items-start flex gap-2">
                  <Trash2 size={12} className="mt-0.5 shrink-0" />
                  <span>This action is final and cannot be reversed by system administrators.</span>
                </div>
                <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setCourseToDelete(null)}
                    className="flex-1 py-4 bg-muted border border-border rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteCourse}
                    className="flex-1 py-4 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all hover:scale-[1.02]"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MaterialViewer({
  material,
  onClose,
  onComplete,
  isCompleted = false,
}: {
  material: Material;
  onClose: () => void;
  onComplete: () => void;
  isCompleted?: boolean;
}) {
  const [loadError, setLoadError] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const safeUrl = getSafeHttpUrl(material.url);
  const youtubeEmbedUrl = safeUrl ? getYouTubeEmbedUrl(safeUrl) : null;
  const isDirectVideo = Boolean(
    safeUrl && (safeUrl.match(/\.(mp4|webm|ogg)(\?|$)/i) || (material.type === 'video' && !youtubeEmbedUrl))
  );
  const isFirebaseMedia = Boolean(
    safeUrl && (safeUrl.match(/\.pdf(\?|$)/i) || safeUrl.includes('?alt=media'))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-2xl p-2 sm:p-4 md:p-8 flex items-center justify-center"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close material viewer"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors z-[210]"
      >
        <CloseIcon size={20} />
      </button>

      <div className="w-full max-w-6xl h-[90vh] sm:h-full flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden mt-8 sm:mt-0">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {material.type === 'video' ? <Video size={22} /> : <BookIcon size={22} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                {material.title}
              </h2>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">
                {material.subject} · {material.type}
              </p>
            </div>
          </div>
          {safeUrl && (
            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0">
              <a
                href={safeUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-muted border border-border text-foreground rounded-xl text-xs font-medium hover:bg-muted/80 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Download size={14} />
                Download
              </a>
              <a
                href={safeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-none justify-center px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
              >
                <ExternalLink size={14} />
                Open Source
              </a>
            </div>
          )}
        </div>

        <div className="flex-1 bg-black/20 flex flex-col items-center justify-center relative group overflow-hidden p-4">
          {loadError || !safeUrl ? (
            <div className="text-center p-6 sm:p-10 max-w-md bg-card border border-border rounded-2xl shadow-xl">
              <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={28} />
              </div>
              <h4 className="text-lg font-bold text-foreground mb-2">Display Restricted</h4>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {safeUrl
                  ? 'Browser safety settings are preventing direct embedding. Open the resource in a new tab for full access.'
                  : 'This material has an invalid or unsupported URL format.'}
              </p>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-xs text-center"
                >
                  Open in New Tab
                </a>
              )}
            </div>
          ) : youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title={material.title}
              className="w-full h-full max-h-[70vh] aspect-video border-none bg-black rounded-xl shadow-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onError={() => setLoadError(true)}
            />
          ) : isDirectVideo ? (
            <video
              controls
              className="w-full h-full max-h-[70vh] rounded-xl shadow-2xl"
              onError={() => setLoadError(true)}
            >
              <source src={safeUrl} />
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={
                isFirebaseMedia
                  ? safeUrl
                  : `https://docs.google.com/viewer?url=${encodeURIComponent(safeUrl)}&embedded=true`
              }
              title={material.title}
              className="w-full h-full border-none bg-white rounded-xl shadow-inner"
              onError={() => setLoadError(true)}
              onLoad={(e) => {
                try {
                  const target = e.target as HTMLIFrameElement;
                  if (target.src === 'about:blank') setLoadError(true);
                } catch {}
              }}
            />
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <div className="flex items-center gap-6 justify-around sm:justify-start w-full sm:w-auto">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Subject</span>
              <span className="text-sm font-medium text-foreground capitalize">
                {material.subject}
              </span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span
                className={cn(
                  'text-sm font-medium flex items-center gap-1.5',
                  completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                )}
              >
                {completed ? 'Completed' : 'In Progress'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (completed) {
                onClose();
                return;
              }
              setCompleted(true);
              setTimeout(() => {
                onComplete();
                onClose();
              }, 1100);
            }}
            className={cn(
              'w-full sm:w-auto justify-center px-6 py-3 rounded-xl font-semibold text-xs transition-colors flex items-center gap-2 whitespace-nowrap shrink-0',
              completed
                ? 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            {completed ? (
              <>
                <ShieldCheck size={16} />
                <span>Completed — Close</span>
              </>
            ) : (
              'Mark Module Complete'
            )}
          </button>
        </div>

        <AnimatePresence>
          {completed && !isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[250] flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-card border border-emerald-500/40 p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-3"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                  <Award size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">Module Completed</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Progress saved to your student profile
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="text-primary">{icon}</div>
      </div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: (msg: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'video' | 'book' | 'pdf' | 'course'>('video');
  const [subject, setSubject] = useState<Subject>('physics');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'link' | 'file'>('link');
  const progressRef = useRef(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds 50MB limit. Please paste a cloud link instead.');
      return;
    }

    setUploading(true);
    setProgress(0);
    progressRef.current = 0;
    
    let attempts = 0;
    const uploadInterval = setInterval(() => {
      attempts++;
      if (progressRef.current < 2 && attempts >= 3) {
        clearInterval(uploadInterval);
        setUploadError('Direct storage upload stalled. Switched to URL Link mode — paste a Google Drive or cloud URL instead.');
        setUploading(false);
        setUploadType('link');
        setProgress(0);
      }
    }, 4000);
    
    try {
      const folder = type === 'video' ? 'videos' : 'materials';
      const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const rounded = Math.round(p);
          setProgress(rounded);
          progressRef.current = rounded;
          if (rounded > 10) clearInterval(uploadInterval);
        }, 
        (error: any) => {
          clearInterval(uploadInterval);
          console.error('Upload error:', error);
          setUploadError('File upload failed. Please paste a direct https:// link instead.');
          setUploading(false);
          setProgress(0);
        }, 
        async () => {
          clearInterval(uploadInterval);
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setUrl(downloadURL);
          setUploading(false);
          setProgress(100);
        }
      );
    } catch (err) {
      clearInterval(uploadInterval);
      console.error('Setup error:', err);
      setUploadError('Unable to initialize storage upload. Please use a direct URL.');
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!title.trim() || !description.trim() || (!url.trim() && type !== 'course')) {
      setUploadError('All required fields must be filled in.');
      return;
    }

    if (type !== 'course' && !getSafeHttpUrl(url)) {
      setUploadError('Resource URL must start with http:// or https://');
      return;
    }
    
    setLoading(true);
    try {
      if (type === 'course') {
        await dbService.createCourse({
          title,
          description,
          subject,
          materialIds: []
        });
      } else {
        await dbService.createMaterial({
          title,
          description,
          type,
          subject,
          url
        });
      }
      onSuccess?.(`${type === 'course' ? 'Course' : 'Material'} "${title.trim()}" published.`);
      onClose();
    } catch (err: any) {
      let msg = err?.message || 'Unable to publish resource.';
      try {
        const errorData = JSON.parse(err.message);
        msg = `${errorData.error} (${errorData.operationType} on ${errorData.path})`;
      } catch {}
      setUploadError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="max-w-2xl w-full bg-card border border-border p-5 sm:p-10 rounded-3xl sm:rounded-[3rem] shadow-2xl space-y-6 sm:space-y-8 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
       >
          <div className="flex items-center justify-between">
             <div>
               <h2 className="text-xl sm:text-3xl font-black italic tracking-tight">Broadcast Resource</h2>
               <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 font-medium italic">Distribute new data to student nodes</p>
             </div>
             <div className="flex flex-col items-end">
                <ShieldCheck className="text-primary mb-1 shrink-0" size={20} />
                <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-primary">Mentor Core</span>
             </div>
          </div>

          {uploadError && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
             <div className="flex bg-muted/30 p-1 rounded-2xl gap-0.5 sm:gap-1">
                {(['video', 'pdf', 'book', 'course'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex-1 py-2 sm:py-3 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all",
                      type === t ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t}
                  </button>
                ))}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Research Field</label>
                  <div className="relative">
                    <select 
                      value={subject} 
                      onChange={e => setSubject(e.target.value as any)}
                      className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-bold text-sm"
                    >
                      <option value="physics">Physics</option>
                      <option value="chemistry">Chemistry</option>
                      <option value="biology">Biology</option>
                      <option value="computer">Computer Science</option>
                      <option value="math">Mathematics</option>
                      <option value="electrical">Electrical Engineering</option>
                    </select>
                    <ChevronRight size={16} className="absolute right-5 top-5 rotate-90 pointer-events-none text-muted-foreground" />
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Asset Status</label>
                  <div className="flex h-[56px] bg-muted/30 border border-border rounded-2xl px-5 items-center justify-between">
                     <span className="text-sm font-bold truncate pr-2">{type === 'course' ? 'Curriculum' : 'Standard Resource'}</span>
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Verified</span>
                     </div>
                  </div>
               </div>
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-end ml-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Material Heading</label>
                   <span className={cn("text-[9px] font-bold", title.length > 40 ? "text-red-500" : "text-muted-foreground")}>{title.length}/50</span>
                </div>
                <input 
                  type="text" 
                  value={title} 
                  maxLength={50}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-sm"
                  placeholder="e.g. Advanced Quantum Mechanics"
                />
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-end ml-1">
                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Abstract / Summary</label>
                   <span className={cn("text-[9px] font-bold", description.length > 450 ? "text-red-500" : "text-muted-foreground")}>{description.length}/500</span>
                </div>
                <textarea 
                  value={description} 
                  maxLength={500}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 h-32 font-medium text-sm leading-relaxed"
                  placeholder="Provide essential context for this unit..."
                />
             </div>

             {type !== 'course' && (
               <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Source Protocol</label>
                    <div className="flex gap-4">
                       <button 
                         type="button" 
                         onClick={() => setUploadType('link')}
                         className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", uploadType === 'link' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                       >
                         URL Link
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setUploadType('file')}
                         className={cn("text-[9px] font-black uppercase tracking-widest transition-colors", uploadType === 'file' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                       >
                         Local File
                       </button>
                    </div>
                  </div>

                  {uploadType === 'link' ? (
                    <div className="relative">
                      <input 
                        type="text" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-xs tracking-tight"
                        placeholder="https://cloud.storage/path/to/asset"
                      />
                      <ExternalLink size={16} className="absolute right-5 top-5 text-muted-foreground opacity-50" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {url ? (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                               {type === 'video' ? <Video size={18} /> : <BookIcon size={18} />}
                             </div>
                             <div>
                                <p className="text-xs font-bold truncate w-40">Asset Loaded Successfully</p>
                                <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest">Storage Linked</p>
                             </div>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => setUrl('')}
                             className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors"
                           >
                             Reset
                           </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                        >
                           <div className="w-16 h-16 rounded-[2rem] bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                              <Plus size={32} />
                           </div>
                           <div>
                              <p className="text-sm font-bold">Select Archive to Upload</p>
                              <p className="text-xs text-muted-foreground mt-1">Recommended: MP4, WebM, PDF (Max 50MB)</p>
                           </div>
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileChange}
                        accept={type === 'video' ? "video/*" : ".pdf,.doc,.docx"}
                      />

                      {uploading && (
                        <div className="p-6 bg-muted/20 border border-border rounded-3xl space-y-4">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                               Transmitting Data...
                            </span>
                            <span className="text-primary">{progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              className="h-full bg-primary"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground ml-1 italic opacity-60">
                    * Protocol Notice: Using direct URLs to existing assets is often more efficient for large-scale distribution.
                  </p>
               </div>
             )}

             <div className="flex gap-4 pt-4 border-t border-border">
               <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-2xl transition-all"
               >
                 Abort Broadcast
               </button>
               <button 
                  type="submit"
                  disabled={loading || uploading}
                  className="flex-1 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/30 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
               >
                 {loading ? 'Transmitting...' : 'Initiate Broadcast'}
               </button>
             </div>
          </form>
       </motion.div>
    </div>
  );
}
