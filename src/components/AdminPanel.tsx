import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Link2,
  Lock,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Video,
  X as CloseIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { dbService, isAdminEmail } from '../services/db';
import { auth, db, signInWithGoogle, storage } from '../lib/firebase';
import { Course, Material, Progress, Subject, UserProfile } from '../types';
import { cn } from '../lib/utils';
import Header from './Header';

export default function AdminPanel() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Bearer token held strictly in React memory (never persisted to localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  // Admin workspace state
  const [activeTab, setActiveTab] = useState<'users' | 'curriculum'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Student' | 'Mentor'>('all');
  const [curriculumSearch, setCurriculumSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<Progress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [badgeInput, setBadgeInput] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetch('/api/admin/status')
      .then((res) => res.json())
      .then((data) => setIsConfigured(Boolean(data?.configured)))
      .catch(() => setIsConfigured(true));
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  const isFirebaseAdmin = Boolean(user && isAdminEmail(user.email));

  useEffect(() => {
    if (!adminToken || !isFirebaseAdmin) return;

    setLoadingData(true);
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setUsers(list);
        setSelectedUser((prev) => (prev ? list.find((u) => u.uid === prev.uid) || null : null));
        setLoadingData(false);
      },
      (err) => {
        console.error('Admin users listener error:', err);
        setBanner({ type: 'error', message: 'Unable to load users from Firestore.' });
        setLoadingData(false);
      }
    );

    const unsubMaterials = onSnapshot(
      collection(db, 'materials'),
      (snap) => {
        setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Material)));
      },
      (err) => {
        console.error('Admin materials listener error:', err);
      }
    );

    const unsubCourses = onSnapshot(
      collection(db, 'courses'),
      (snap) => {
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      },
      (err) => {
        console.error('Admin courses listener error:', err);
      }
    );

    return () => {
      unsubUsers();
      unsubMaterials();
      unsubCourses();
    };
  }, [adminToken, isFirebaseAdmin]);

  useEffect(() => {
    if (!adminToken || !isFirebaseAdmin || !selectedUser) {
      setSelectedProgress([]);
      setProgressLoading(false);
      return;
    }

    setProgressLoading(true);
    const q = query(collection(db, 'progress'), where('userId', '==', selectedUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSelectedProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Progress)));
        setProgressLoading(false);
      },
      () => {
        setProgressLoading(false);
      }
    );

    return () => unsub();
  }, [adminToken, isFirebaseAdmin, selectedUser?.uid]);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim();
    if (!cleaned) return;

    setVerifying(true);
    setAuthError(null);
    try {
      const endpoint = isConfigured === false ? '/api/admin/claim' : '/api/admin/verify';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleaned }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.verified || !data?.token) {
        setAuthError(data?.error || 'Invalid admin access code. Please check and try again.');
        setVerifying(false);
        return;
      }
      setAdminToken(data.token);
      setCode('');
    } catch {
      setAuthError('Unable to reach verification server. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setGoogleSigningIn(true);
    setAuthError(null);
    try {
      if (user && !isAdminEmail(user.email)) {
        await firebaseSignOut(auth);
      }
      await signInWithGoogle();
      await refreshProfile();
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setAuthError('Browser blocked the sign-in popup. Please allow popups and try again.');
      } else {
        setAuthError(err?.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleToggleRole = async (target: UserProfile) => {
    const nextRole = target.role === 'Mentor' ? 'Student' : 'Mentor';
    setActionBusy(target.uid);
    try {
      await dbService.updateUserProfile(target.uid, { role: nextRole });
      setBanner({ type: 'success', message: `${target.displayName} updated to ${nextRole}.` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not update role.' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleAwardBadge = async (target: UserProfile) => {
    const cleanBadge = badgeInput.trim();
    if (!cleanBadge) return;
    setActionBusy(`badge_${target.uid}`);
    try {
      await dbService.awardBadge(target.uid, cleanBadge);
      setBadgeInput('');
      setBanner({ type: 'success', message: `Badge "${cleanBadge}" awarded to ${target.displayName}.` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not award badge.' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleMaterialPriority = async (mat: Material) => {
    setActionBusy(mat.id);
    try {
      await dbService.toggleMaterialPriority(mat.id, Boolean(mat.isPrioritized));
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not update priority.' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeleteMaterial = async (mat: Material) => {
    setActionBusy(mat.id);
    try {
      await dbService.deleteMaterial(mat.id);
      setBanner({ type: 'success', message: `Deleted "${mat.title}".` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not delete material.' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    setActionBusy(course.id);
    try {
      await dbService.deleteCourse(course.id);
      setBanner({ type: 'success', message: `Deleted course "${course.title}".` });
    } catch (err: any) {
      setBanner({ type: 'error', message: err?.message || 'Could not delete course.' });
    } finally {
      setActionBusy(null);
    }
  };

  const studentCount = useMemo(() => users.filter((u) => u.role === 'Student').length, [users]);
  const mentorCount = useMemo(() => users.filter((u) => u.role === 'Mentor').length, [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users
      .filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (!q) return true;
        return (
          u.displayName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [users, userSearch, roleFilter]);

  const filteredMaterials = useMemo(() => {
    const q = curriculumSearch.trim().toLowerCase();
    return materials.filter((m) => {
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q)
      );
    });
  }, [materials, curriculumSearch]);

  const filteredCourses = useMemo(() => {
    const q = curriculumSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q);
    });
  }, [courses, curriculumSearch]);

  // Step 1: Passcode Gate
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Lock size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {isConfigured === false ? 'Set Admin Access Code' : 'Admin Panel Access'}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isConfigured === false
                    ? 'First-run setup: enter your admin code to lock and open the panel'
                    : 'Enter your administrator access code to continue'}
                </p>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2.5"
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-access-code" className="text-xs font-medium text-muted-foreground">
                  Access Code
                </label>
                <div className="relative">
                  <input
                    id="admin-access-code"
                    type={showCode ? 'text' : 'password'}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter access code"
                    autoComplete="off"
                    autoFocus
                    className="w-full px-4 py-3 pr-11 bg-background border border-border rounded-xl font-mono text-sm tracking-wider text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode((v) => !v)}
                    aria-label={showCode ? 'Hide access code' : 'Show access code'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!code.trim() || verifying}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} />
                <span>{verifying ? 'Verifying...' : 'Enter Admin Panel'}</span>
              </button>
            </form>

            <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Home</span>
              </Link>
              <span className="text-muted-foreground">Protected access</span>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Step 2: Unlocked Admin Panel (with Firebase Admin account check for DB operations)
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Admin Panel
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage users, mentor roles, badges, courses, and learning resources
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isFirebaseAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={15} />
                <span>Publish Resource</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setAdminToken(null)}
              className="px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogOut size={14} />
              <span>Lock Panel</span>
            </button>
          </div>
        </header>

        <AnimatePresence>
          {banner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={cn(
                'p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3',
                banner.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              )}
            >
              <div className="flex items-center gap-2">
                {banner.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{banner.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setBanner(null)}
                aria-label="Dismiss message"
                className="p-1 hover:opacity-70"
              >
                <CloseIcon size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isFirebaseAdmin ? (
          <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mx-auto">
              <UserCheck size={22} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">
                Administrator Sign-In Required
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {user
                  ? `Currently signed in as ${user.email}. Sign in with an authorized administrator Google account to read and modify Firestore records.`
                  : 'Access code verified. Sign in with your administrator Google account to manage users, roles, and curriculum data.'}
              </p>
            </div>
            {authError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {authError}
              </p>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleGoogleAdminSignIn}
                disabled={googleSigningIn}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {googleSigningIn
                  ? 'Signing in...'
                  : user
                    ? 'Switch to Admin Google Account'
                    : 'Sign in with Google'}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Overview KPIs */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <AdminStat label="Total Students" value={studentCount} />
              <AdminStat label="Total Mentors" value={mentorCount} />
              <AdminStat label="Published Materials" value={materials.length} />
              <AdminStat label="Active Courses" value={courses.length} />
            </section>

            {/* Section Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  activeTab === 'users'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Users &amp; Roles ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('curriculum')}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                  activeTab === 'curriculum'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Materials &amp; Courses ({materials.length + courses.length})
              </button>
            </div>

            {activeTab === 'users' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <section className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name or username..."
                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-xl shrink-0">
                      {(['all', 'Student', 'Mentor'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRoleFilter(r)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                            roleFilter === r
                              ? 'bg-card text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {r === 'all' ? 'All' : `${r}s`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingData ? (
                    <div className="space-y-2.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No matching users found.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredUsers.map((u) => (
                        <div
                          key={u.uid}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedUser(u)}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left group"
                          >
                            <div
                              className={cn(
                                'w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm shrink-0',
                                selectedUser?.uid === u.uid
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              )}
                            >
                              {u.displayName?.[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {u.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate tabular-nums">
                                @{u.username} · {u.role} · {u.points || 0} pts
                              </p>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={actionBusy === u.uid}
                              onClick={() => handleToggleRole(u)}
                              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {u.role === 'Mentor' ? 'Set Student' : 'Promote Mentor'}
                            </button>
                            <ChevronRight size={15} className="text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* User Details Inspector */}
                <section className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 space-y-5">
                  {!selectedUser ? (
                    <div className="py-12 text-center space-y-2 text-muted-foreground">
                      <Users size={24} className="mx-auto opacity-60" />
                      <p className="text-sm font-medium text-foreground">Select a user</p>
                      <p className="text-xs">
                        Choose a student or mentor from the list to inspect progress and award badges.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-foreground truncate">
                            {selectedUser.displayName}
                          </h2>
                          <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                            @{selectedUser.username} · {selectedUser.role} · {selectedUser.points || 0} pts
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          Award Achievement Badge
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={badgeInput}
                            onChange={(e) => setBadgeInput(e.target.value)}
                            maxLength={80}
                            placeholder="e.g. Top Researcher"
                            className="flex-1 px-3.5 py-2 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <button
                            type="button"
                            disabled={!badgeInput.trim() || actionBusy === `badge_${selectedUser.uid}`}
                            onClick={() => handleAwardBadge(selectedUser)}
                            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                          >
                            Award
                          </button>
                        </div>
                        {selectedUser.achievements?.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-2 text-xs text-muted-foreground">
                            {selectedUser.achievements.map((b) => (
                              <span key={b} className="inline-flex items-center gap-1 text-foreground">
                                <Award size={12} className="text-primary" />
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-3 border-t border-border">
                        <h3 className="text-xs font-medium text-muted-foreground">
                          Completed Modules ({selectedProgress.length})
                        </h3>
                        {progressLoading ? (
                          <p className="text-xs text-muted-foreground">Loading progress...</p>
                        ) : selectedProgress.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No modules completed yet.
                          </p>
                        ) : (
                          <div className="divide-y divide-border">
                            {selectedProgress.map((p) => {
                              const mat = materials.find((m) => m.id === p.materialId);
                              const dt = p.updatedAt?.toDate ? p.updatedAt.toDate() : null;
                              return (
                                <div
                                  key={p.id}
                                  className="py-2 flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="font-medium text-foreground truncate">
                                    {mat?.title || p.materialId}
                                  </span>
                                  {dt && (
                                    <span className="text-muted-foreground tabular-nums shrink-0">
                                      {format(dt, 'MMM d')}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative max-w-md">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={curriculumSearch}
                    onChange={(e) => setCurriculumSearch(e.target.value)}
                    placeholder="Filter materials or courses..."
                    className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-base font-semibold text-foreground">
                      Materials ({filteredMaterials.length})
                    </h2>
                    {filteredMaterials.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6">No materials found.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredMaterials.map((m) => (
                          <div
                            key={m.id}
                            className="py-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                                {m.type === 'video' ? (
                                  <Video size={16} />
                                ) : m.type === 'pdf' ? (
                                  <FileText size={16} />
                                ) : (
                                  <BookOpen size={16} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {m.title}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {m.subject} · {m.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={actionBusy === m.id}
                                onClick={() => handleToggleMaterialPriority(m)}
                                title="Toggle priority"
                                className={cn(
                                  'p-2 rounded-lg transition-colors',
                                  m.isPrioritized
                                    ? 'text-amber-500 bg-amber-500/10'
                                    : 'text-muted-foreground hover:bg-muted'
                                )}
                              >
                                <Star size={15} fill={m.isPrioritized ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                type="button"
                                disabled={actionBusy === m.id}
                                onClick={() => handleDeleteMaterial(m)}
                                title="Delete material"
                                className="p-2 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h2 className="text-base font-semibold text-foreground">
                      Courses ({filteredCourses.length})
                    </h2>
                    {filteredCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6">No courses published.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredCourses.map((c) => (
                          <div
                            key={c.id}
                            className="py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {c.title}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize tabular-nums">
                                {c.subject} · {c.materialIds?.length || 0} modules
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={actionBusy === c.id}
                              onClick={() => handleDeleteCourse(c)}
                              title="Delete course"
                              className="p-2 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted transition-colors shrink-0"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            )}
          </>
        )}

        <AnimatePresence>
          {showCreateModal && (
            <AdminPublishModal
              existingMaterials={materials}
              onClose={() => setShowCreateModal(false)}
              onSuccess={(msg) => {
                setBanner({ type: 'success', message: msg });
                setShowCreateModal(false);
              }}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function deriveTitleFromFilename(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function uploadFileToFirebaseStorage(
  file: File,
  kind: 'video' | 'pdf' | 'book',
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(new Error('File size exceeds the 50 MB limit.'));
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = kind === 'video' ? 'videos' : 'materials';
    const storageRef = ref(storage, `${folder}/${Date.now()}_${safeName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    let lastPct = 0;
    let stallTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (lastPct < 2) {
        try {
          uploadTask.cancel();
        } catch {
          // Ignore cancel errors
        }
        reject(
          new Error(
            'Storage upload stalled. Verify Firebase Storage is enabled for this project or paste a direct HTTPS link instead.'
          )
        );
      }
    }, 12000);

    const clearStall = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        lastPct = pct;
        onProgress(pct);
        if (pct >= 2) clearStall();
      },
      (err) => {
        clearStall();
        reject(new Error(err?.message || 'File upload failed.'));
      },
      async () => {
        clearStall();
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress(100);
          resolve(downloadURL);
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to retrieve uploaded file URL.'));
        }
      }
    );
  });
}

interface StagedCourseUpload {
  localId: string;
  title: string;
  type: 'video' | 'pdf';
  url: string;
  fileName: string;
  sizeBytes: number;
}

function AdminPublishModal({
  existingMaterials,
  onClose,
  onSuccess,
}: {
  existingMaterials: Material[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [kind, setKind] = useState<'video' | 'pdf' | 'book' | 'course'>('video');
  const [sourceMode, setSourceMode] = useState<'file' | 'link'>('file');
  const [subject, setSubject] = useState<Subject>('physics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [uploadedFileMeta, setUploadedFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Course attachments (local PDF/video uploads + optional existing library links)
  const [courseUploads, setCourseUploads] = useState<StagedCourseUpload[]>([]);
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const courseFileInputRef = useRef<HTMLInputElement>(null);

  const subjectExistingMaterials = useMemo(
    () => existingMaterials.filter((m) => m.subject === subject),
    [existingMaterials, subject]
  );

  const handleKindChange = (nextKind: 'video' | 'pdf' | 'book' | 'course') => {
    setKind(nextKind);
    setError(null);
    setUrl('');
    setUploadedFileMeta(null);
    setUploadProgress(0);
  };

  const handleSingleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || kind === 'course') return;

    setError(null);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);

    if (kind === 'video' && !isVideo) {
      setError('Please select a valid video file (.mp4, .webm, .mov).');
      return;
    }
    if (kind === 'pdf' && !isPdf) {
      setError('Please select a PDF file (.pdf).');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const downloadUrl = await uploadFileToFirebaseStorage(file, kind, setUploadProgress);
      setUrl(downloadUrl);
      setUploadedFileMeta({ name: file.name, size: file.size });
      if (!title.trim()) {
        setTitle(deriveTitleFromFilename(file.name));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to upload file.');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCourseFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (!isVideo && !isPdf) {
          throw new Error(`"${file.name}" is not a supported PDF or video file.`);
        }
        const detectedType: 'video' | 'pdf' = isVideo ? 'video' : 'pdf';
        setUploadProgress(0);
        const downloadUrl = await uploadFileToFirebaseStorage(file, detectedType, setUploadProgress);
        setCourseUploads((prev) => [
          ...prev,
          {
            localId: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: deriveTitleFromFilename(file.name) || file.name,
            type: detectedType,
            url: downloadUrl,
            fileName: file.name,
            sizeBytes: file.size,
          },
        ]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to upload course file.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const toggleExistingMaterial = (id: string) => {
    setSelectedExistingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (uploading) {
      setError('Please wait for the file upload to complete.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError('Please enter both a title and description.');
      return;
    }

    if (kind !== 'course') {
      if (!url.trim()) {
        setError(
          sourceMode === 'file'
            ? 'Please upload a file from your device first.'
            : 'Please paste a valid resource URL.'
        );
        return;
      }
      if (!isValidHttpUrl(url)) {
        setError('Resource URL must start with http:// or https://.');
        return;
      }
    }

    setSaving(true);
    try {
      if (kind === 'course') {
        const createdMaterialIds: string[] = [];
        for (const item of courseUploads) {
          const matId = await dbService.createMaterial({
            title: item.title.trim() || item.fileName,
            description: `${title.trim()} · Course ${item.type === 'video' ? 'video lesson' : 'PDF handout'}`.slice(0, 1000),
            type: item.type,
            subject,
            url: item.url,
          });
          createdMaterialIds.push(matId);
        }

        const combinedIds = Array.from(new Set([...selectedExistingIds, ...createdMaterialIds]));
        await dbService.createCourse({
          title,
          description,
          subject,
          materialIds: combinedIds,
        });
      } else {
        await dbService.createMaterial({
          title,
          description,
          type: kind,
          subject,
          url,
        });
      }
      onSuccess(`Published "${title.trim()}".`);
    } catch (err: any) {
      setError(err?.message || 'Unable to publish resource.');
    } finally {
      setSaving(false);
    }
  };

  const acceptAttr =
    kind === 'video'
      ? 'video/*,.mp4,.webm,.mov'
      : kind === 'pdf'
        ? '.pdf,application/pdf'
        : '.pdf,.doc,.docx,.epub,application/pdf';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-xl hover:bg-muted text-muted-foreground"
        >
          <CloseIcon size={18} />
        </button>

        <div>
          <h2 className="text-lg font-bold text-foreground">Publish Resource</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload local PDFs or videos directly, or attach external HTTPS links.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-1 p-1 bg-muted rounded-xl">
            {(['video', 'pdf', 'book', 'course'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleKindChange(t)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap',
                  kind === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value as Subject);
                setSelectedExistingIds([]);
              }}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground"
            >
              <option value="computer">Computer Science</option>
              <option value="physics">Physics</option>
              <option value="biology">Biology</option>
              <option value="chemistry">Chemistry</option>
              <option value="math">Mathematics</option>
              <option value="electrical">Electrical Engineering</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Thermodynamics Fundamentals"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of topics covered..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground"
              required
            />
          </div>

          {kind !== 'course' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Resource Source</span>
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode('file');
                      setError(null);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                      sourceMode === 'file'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Upload size={13} />
                    <span>Local File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceMode('link');
                      setError(null);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                      sourceMode === 'link'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Link2 size={13} />
                    <span>URL Link</span>
                  </button>
                </div>
              </div>

              {sourceMode === 'file' ? (
                <div className="space-y-2.5">
                  <input
                    ref={singleFileInputRef}
                    type="file"
                    accept={acceptAttr}
                    onChange={handleSingleFileSelect}
                    className="hidden"
                  />

                  {uploading ? (
                    <div className="p-4 rounded-xl bg-muted/60 border border-border space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">Uploading file to storage...</span>
                        <span className="font-semibold text-foreground tabular-nums">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : uploadedFileMeta && url ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {uploadedFileMeta.name}
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
                          Uploaded · {formatFileSize(uploadedFileMeta.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => singleFileInputRef.current?.click()}
                          className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUrl('');
                            setUploadedFileMeta(null);
                            setUploadProgress(0);
                          }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => singleFileInputRef.current?.click()}
                      className="w-full p-5 rounded-xl border border-dashed border-border bg-background hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-1.5 text-center"
                    >
                      <Upload size={20} className="text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        Choose {kind === 'video' ? 'video' : kind === 'pdf' ? 'PDF' : 'document'} from device
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {kind === 'video'
                          ? 'MP4, WebM, MOV up to 50 MB'
                          : kind === 'pdf'
                            ? 'PDF up to 50 MB'
                            : 'PDF, EPUB, DOC up to 50 MB'}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Resource URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUploadedFileMeta(null);
                    }}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground"
                    required
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-1 border-t border-border">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Upload Course PDFs &amp; Videos (Optional)
                  </label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {courseUploads.length} attached
                  </span>
                </div>

                <input
                  ref={courseFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,application/pdf,video/*,.mp4,.webm,.mov"
                  onChange={handleCourseFileSelect}
                  className="hidden"
                />

                {uploading ? (
                  <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Uploading course file...</span>
                      <span className="font-semibold text-foreground tabular-nums">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => courseFileInputRef.current?.click()}
                    className="w-full p-4 rounded-xl border border-dashed border-border bg-background hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-foreground"
                  >
                    <Upload size={15} className="text-primary shrink-0" />
                    <span>Upload PDF or Video files from local storage (up to 50 MB each)</span>
                  </button>
                )}

                {courseUploads.length > 0 && (
                  <div className="divide-y divide-border border border-border rounded-xl bg-background">
                    {courseUploads.map((item) => (
                      <div key={item.localId} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            {item.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <input
                              type="text"
                              value={item.title}
                              maxLength={100}
                              onChange={(e) =>
                                setCourseUploads((prev) =>
                                  prev.map((row) =>
                                    row.localId === item.localId ? { ...row, title: e.target.value } : row
                                  )
                                )
                              }
                              aria-label="Module title"
                              className="w-full px-2 py-1 bg-card border border-border rounded-lg text-xs font-medium text-foreground"
                            />
                            <p className="text-[11px] text-muted-foreground truncate tabular-nums">
                              {item.type.toUpperCase()} · {formatFileSize(item.sizeBytes)} · {item.fileName}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCourseUploads((prev) => prev.filter((row) => row.localId !== item.localId))
                          }
                          aria-label="Remove uploaded file"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {subjectExistingMaterials.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Include Existing {subject} Materials (Optional)
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {selectedExistingIds.length} selected
                    </span>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border border border-border rounded-xl bg-background">
                    {subjectExistingMaterials.map((mat) => {
                      const checked = selectedExistingIds.includes(mat.id);
                      return (
                        <label
                          key={mat.id}
                          className="px-3 py-2 flex items-center gap-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleExistingMaterial(mat.id)}
                            className="rounded border-border"
                          />
                          <span className="text-xs font-medium text-foreground truncate flex-1">
                            {mat.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground uppercase shrink-0">
                            {mat.type}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            >
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
