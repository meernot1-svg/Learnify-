import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Atom,
  AudioLines,
  Award,
  Beaker,
  Bell,
  Binary,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Dna,
  Download,
  ExternalLink,
  FileDown,
  FileQuestion,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  MessageSquare,
  Play,
  Search,
  Star,
  Target,
  Trash2,
  Trophy,
  Video,
  X as CloseIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfWeek,
} from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { dbService } from '../services/db';
import { learningDataService } from '../services/learningData';
import { db } from '../lib/firebase';
import {
  Course,
  LabResult,
  Material,
  MaterialType,
  Progress,
  SavedQuiz,
  StudyReminder,
  Subject,
  UserProfile,
} from '../types';
import { cn } from '../lib/utils';
import { downloadPortfolioLabReportPdf, downloadSingleLabReportPdf } from '../lib/pdfLabReport';
import AILearningTwin from './AILearningTwin';
import { MaterialViewer } from './Dashboard';
import StudyReminders from './StudyReminders';
import WeeklyStudyActivity, { WeeklyStudyActivityEntry } from './WeeklyStudyActivity';

function getSafeHttpUrl(rawUrl?: string): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function toTimestampDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const sec = (value as { seconds?: unknown }).seconds;
    if (typeof sec === 'number') {
      const d = new Date(sec * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const SUBJECT_META: Record<
  Subject,
  {
    label: string;
    shortLabel: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accentText: string;
    barColor: string;
  }
> = {
  computer: {
    label: 'Computer Science',
    shortLabel: 'Computer',
    subtitle: 'Algorithms, programming & systems',
    icon: Binary,
    accentText: 'text-sky-600 dark:text-sky-400',
    barColor: 'bg-sky-500',
  },
  physics: {
    label: 'Physics',
    shortLabel: 'Physics',
    subtitle: 'Mechanics, waves & interactive labs',
    icon: Atom,
    accentText: 'text-violet-600 dark:text-violet-400',
    barColor: 'bg-violet-500',
  },
  biology: {
    label: 'Biology',
    shortLabel: 'Biology',
    subtitle: 'Cellular systems, genetics & labs',
    icon: Dna,
    accentText: 'text-emerald-600 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
  },
  chemistry: {
    label: 'Chemistry',
    shortLabel: 'Chemistry',
    subtitle: 'Reactions, bonding & titration lab',
    icon: Beaker,
    accentText: 'text-amber-600 dark:text-amber-400',
    barColor: 'bg-amber-500',
  },
  math: {
    label: 'Mathematics',
    shortLabel: 'Math',
    subtitle: 'Calculus, 3D geometry & probability',
    icon: Calculator,
    accentText: 'text-rose-600 dark:text-rose-400',
    barColor: 'bg-rose-500',
  },
  electrical: {
    label: 'Electrical Eng.',
    shortLabel: 'Electrical',
    subtitle: 'Circuits, oscilloscope & logic gates',
    icon: Cpu,
    accentText: 'text-cyan-600 dark:text-cyan-400',
    barColor: 'bg-cyan-500',
  },
};

const SUBJECT_ORDER: Subject[] = ['computer', 'physics', 'biology', 'chemistry', 'math', 'electrical'];

export default function StudentDashboard() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [progress, setProgress] = useState<Progress[]>([]);
  const [firestoreMaterials, setFirestoreMaterials] = useState<Material[]>([]);
  const [starterMaterials, setStarterMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);

  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [learningLoading, setLearningLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(true);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showReminders, setShowReminders] = useState(false);
  const [activeNotification, setActiveNotification] = useState<StudyReminder | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<'all' | Subject>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MaterialType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [archiveTab, setArchiveTab] = useState<'all' | 'quizzes' | 'labs'>('all');
  const [trackerView, setTrackerView] = useState<'subjects' | 'quizzes'>('subjects');
  const [weeklyGoalHours, setWeeklyGoalHours] = useState<number>(10);
  const [goalInput, setGoalInput] = useState<string>('10');
  const [goalSaved, setGoalSaved] = useState(false);
  const [deletingArchiveId, setDeletingArchiveId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // Track starter fallback completion locally when Firestore materials collection is empty
  const [localStarterCompleted, setLocalStarterCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setLocalStarterCompleted([]);
      setWeeklyGoalHours(10);
      setGoalInput('10');
      return;
    }
    try {
      const raw = localStorage.getItem(`starter_completed_${user.uid}`);
      setLocalStarterCompleted(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setLocalStarterCompleted([]);
    }
    try {
      const rawGoal = localStorage.getItem(`weekly_goal_hours_${user.uid}`);
      const parsed = rawGoal ? Number(rawGoal) : 10;
      const valid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 80 ? Number(parsed.toFixed(1)) : 10;
      setWeeklyGoalHours(valid);
      setGoalInput(String(valid));
    } catch {
      setWeeklyGoalHours(10);
      setGoalInput('10');
    }
  }, [user]);

  const updateWeeklyGoal = (nextValue: number) => {
    const clamped = Math.min(80, Math.max(1, Number(nextValue.toFixed(1))));
    setWeeklyGoalHours(clamped);
    setGoalInput(String(clamped));
    if (user) {
      try {
        localStorage.setItem(`weekly_goal_hours_${user.uid}`, String(clamped));
      } catch {
        // Ignore storage errors
      }
    }
    setGoalSaved(true);
    window.setTimeout(() => setGoalSaved(false), 2200);
  };

  useEffect(() => {
    if (!user) return;

    let active = true;
    setMaterialsLoading(true);
    setLeaderboardLoading(true);
    setLearningLoading(true);
    setRemindersLoading(true);

    // Load curated starter modules once as graceful fallback when Firestore materials collection is empty
    dbService
      .getMaterials()
      .then((data) => {
        if (active) setStarterMaterials(data);
      })
      .catch(() => {
        if (active) setStarterMaterials([]);
      });

    Promise.all([
      learningDataService.getSavedQuizzes(user.uid).catch(() => []),
      learningDataService.getLabResults(user.uid).catch(() => []),
    ]).then(([quizzes, labs]) => {
      if (!active) return;
      setSavedQuizzes(quizzes);
      setLabResults(labs);
      setLearningLoading(false);
    });

    dbService
      .getLeaderboard()
      .then((data) => {
        if (!active) return;
        setLeaderboard(data);
        setLeaderboardLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLeaderboard([]);
        setLeaderboardLoading(false);
      });

    const unsubProgress = onSnapshot(
      query(collection(db, 'progress'), where('userId', '==', user.uid)),
      (snap) => {
        setProgress(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Progress)));
      },
      (err) => {
        console.error('Progress listener error:', err);
      }
    );

    const unsubMaterials = onSnapshot(
      collection(db, 'materials'),
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Material))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setFirestoreMaterials(docs);
        setMaterialsLoading(false);
      },
      (err) => {
        console.error('Student materials listener error:', err);
        setMaterialsLoading(false);
      }
    );

    const unsubCourses = onSnapshot(
      collection(db, 'courses'),
      (snap) => {
        const docs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Course))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCourses(docs);
      },
      (err) => {
        console.error('Student courses listener error:', err);
      }
    );

    const unsubReminders = onSnapshot(
      query(collection(db, 'reminders'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as StudyReminder))
          .sort((a, b) => {
            const ta = toTimestampDate(a.time)?.getTime() ?? 0;
            const tb = toTimestampDate(b.time)?.getTime() ?? 0;
            return ta - tb;
          });
        setReminders(list);
        setRemindersLoading(false);

        const now = Date.now();
        list.forEach((r) => {
          if (r.isNotified) return;
          const time = toTimestampDate(r.time);
          if (time && now >= time.getTime()) {
            setActiveNotification(r);
            dbService.markReminderNotified(r.id).catch((err) => {
              console.error('Reminder mark error:', err);
            });
          }
        });
      },
      (err) => {
        console.error('Reminders listener error:', err);
        setRemindersLoading(false);
      }
    );

    const interval = setInterval(() => {
      dbService
        .getReminders(user.uid)
        .then((list) => {
          const now = Date.now();
          list.forEach((r) => {
            if (r.isNotified) return;
            const time = toTimestampDate(r.time);
            if (time && now >= time.getTime()) {
              setActiveNotification(r);
              dbService.markReminderNotified(r.id).catch((err) => {
                console.error('Reminder mark error:', err);
              });
            }
          });
        })
        .catch(() => {});
    }, 30000);

    return () => {
      active = false;
      unsubProgress();
      unsubMaterials();
      unsubCourses();
      unsubReminders();
      clearInterval(interval);
    };
  }, [user]);

  const isUsingStarterFallback = !materialsLoading && firestoreMaterials.length === 0 && starterMaterials.length > 0;
  const effectiveMaterials = useMemo(
    () => (firestoreMaterials.length > 0 ? firestoreMaterials : starterMaterials),
    [firestoreMaterials, starterMaterials]
  );

  const completedIds = useMemo(() => {
    const ids = new Set(progress.map((p) => p.materialId));
    localStarterCompleted.forEach((id) => ids.add(id));
    return ids;
  }, [progress, localStarterCompleted]);

  const prioritizedMaterials = useMemo(
    () => effectiveMaterials.filter((m) => m.isPrioritized),
    [effectiveMaterials]
  );

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveMaterials.filter((m) => {
      if (subjectFilter !== 'all' && m.subject !== subjectFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      const done = completedIds.has(m.id);
      if (statusFilter === 'completed' && !done) return false;
      if (statusFilter === 'todo' && done) return false;
      if (q) {
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDesc = (m.description || '').toLowerCase().includes(q);
        const matchesSubject = SUBJECT_META[m.subject]?.label.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSubject) return false;
      }
      return true;
    });
  }, [effectiveMaterials, searchQuery, subjectFilter, typeFilter, statusFilter, completedIds]);

  const videoMaterials = useMemo(
    () => effectiveMaterials.filter((m) => m.type === 'video'),
    [effectiveMaterials]
  );
  const readingMaterials = useMemo(
    () => effectiveMaterials.filter((m) => m.type === 'book' || m.type === 'pdf'),
    [effectiveMaterials]
  );
  const completedVideos = useMemo(
    () => videoMaterials.filter((m) => completedIds.has(m.id)).length,
    [videoMaterials, completedIds]
  );
  const completedReadings = useMemo(
    () => readingMaterials.filter((m) => completedIds.has(m.id)).length,
    [readingMaterials, completedIds]
  );
  const totalCompleted = useMemo(
    () => effectiveMaterials.filter((m) => completedIds.has(m.id)).length,
    [effectiveMaterials, completedIds]
  );
  const overallPct =
    effectiveMaterials.length > 0 ? Math.round((totalCompleted / effectiveMaterials.length) * 100) : 0;

  const weeklyStudy = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyTotals = days.map((day) => ({
      day,
      label: format(day, 'EEE'),
      hours: 0,
    }));

    let quizHours = 0;
    let moduleHours = 0;
    let labHours = 0;

    savedQuizzes.forEach((quiz) => {
      const dt = toTimestampDate(quiz.createdAt);
      if (!dt || !isWithinInterval(dt, { start: weekStart, end: weekEnd })) return;
      const hrs = quiz.timeSpentSeconds > 0 ? quiz.timeSpentSeconds / 3600 : 0.25;
      quizHours += hrs;
      const bucket = dailyTotals.find((d) => isSameDay(d.day, dt));
      if (bucket) bucket.hours += hrs;
    });

    progress.forEach((entry) => {
      const dt = toTimestampDate(entry.updatedAt);
      if (!dt || !isWithinInterval(dt, { start: weekStart, end: weekEnd })) return;
      const mat = effectiveMaterials.find((m) => m.id === entry.materialId);
      const hrs = mat?.type === 'video' ? 0.5 : 0.4;
      moduleHours += hrs;
      const bucket = dailyTotals.find((d) => isSameDay(d.day, dt));
      if (bucket) bucket.hours += hrs;
    });

    // Count local starter completions if no Firestore progress entries cover them
    if (localStarterCompleted.length > 0 && firestoreMaterials.length === 0) {
      const starterHrs = localStarterCompleted.length * 0.5;
      moduleHours += starterHrs;
      const todayBucket = dailyTotals.find((d) => isSameDay(d.day, now));
      if (todayBucket) todayBucket.hours += starterHrs;
    }

    labResults.forEach((lab) => {
      const dt = toTimestampDate(lab.createdAt);
      if (!dt || !isWithinInterval(dt, { start: weekStart, end: weekEnd })) return;
      const hrs = 0.5;
      labHours += hrs;
      const bucket = dailyTotals.find((d) => isSameDay(d.day, dt));
      if (bucket) bucket.hours += hrs;
    });

    const totalHours = Number((quizHours + moduleHours + labHours).toFixed(1));
    const goalPct = Math.min(100, Math.round((totalHours / weeklyGoalHours) * 100));

    return {
      weekRangeLabel: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
      totalHours,
      quizHours: Number(quizHours.toFixed(1)),
      moduleHours: Number(moduleHours.toFixed(1)),
      labHours: Number(labHours.toFixed(1)),
      goalPct,
      dailyTotals: dailyTotals.map((d) => ({
        label: d.label,
        hours: Number(d.hours.toFixed(1)),
        isToday: isSameDay(d.day, now),
      })),
    };
  }, [
    savedQuizzes,
    progress,
    labResults,
    effectiveMaterials,
    localStarterCompleted,
    firestoreMaterials.length,
    weeklyGoalHours,
  ]);

  const radialChartData = useMemo(
    () => [
      {
        name: 'Weekly Study Hours',
        value: weeklyStudy.goalPct,
        displayValue: `${weeklyStudy.totalHours.toFixed(1)}h / ${weeklyGoalHours}h goal`,
        fill: '#38bdf8',
      },
      {
        name: 'Course Completion',
        value: overallPct,
        displayValue: `${overallPct}% (${totalCompleted}/${effectiveMaterials.length} modules)`,
        fill: '#10b981',
      },
    ],
    [weeklyStudy.goalPct, weeklyStudy.totalHours, weeklyGoalHours, overallPct, totalCompleted, effectiveMaterials.length]
  );

  const weeklyActivityEntries = useMemo<WeeklyStudyActivityEntry[]>(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const items: WeeklyStudyActivityEntry[] = [];
    const seenMaterialIds = new Set<string>();

    progress.forEach((entry) => {
      const mat = effectiveMaterials.find((m) => m.id === entry.materialId);
      const dt = toTimestampDate(entry.updatedAt);
      const inWeek = Boolean(dt && isWithinInterval(dt, { start: weekStart, end: weekEnd }));
      seenMaterialIds.add(entry.materialId);
      items.push({
        id: `progress_${entry.materialId}`,
        title: mat?.title || 'Completed Lesson',
        subject: mat?.subject || 'computer',
        kind: mat?.type === 'video' ? 'video' : mat?.type === 'pdf' ? 'pdf' : 'book',
        durationMinutes: mat?.type === 'video' ? 30 : 24,
        completedAt: dt,
        isCurrentWeek: inWeek,
        detailLabel: 'Lesson completed',
        onOpen: () => {
          if (mat) setSelectedMaterial(mat);
        },
      });
    });

    if (localStarterCompleted.length > 0 && firestoreMaterials.length === 0) {
      localStarterCompleted.forEach((matId) => {
        if (seenMaterialIds.has(matId)) return;
        const mat = effectiveMaterials.find((m) => m.id === matId);
        if (!mat) return;
        items.push({
          id: `starter_${mat.id}`,
          title: mat.title,
          subject: mat.subject,
          kind: mat.type === 'video' ? 'video' : mat.type === 'pdf' ? 'pdf' : 'book',
          durationMinutes: mat.type === 'video' ? 30 : 24,
          completedAt: now,
          isCurrentWeek: true,
          detailLabel: 'Lesson completed',
          onOpen: () => setSelectedMaterial(mat),
        });
      });
    }

    savedQuizzes.forEach((quiz) => {
      const dt = toTimestampDate(quiz.createdAt);
      const inWeek = Boolean(dt && isWithinInterval(dt, { start: weekStart, end: weekEnd }));
      const minutes = quiz.timeSpentSeconds > 0 ? Math.max(5, Math.round(quiz.timeSpentSeconds / 60)) : 15;
      items.push({
        id: `quiz_${quiz.id}`,
        title: quiz.title,
        subject: quiz.subject,
        kind: 'quiz',
        durationMinutes: minutes,
        completedAt: dt,
        isCurrentWeek: inWeek,
        detailLabel: `${quiz.score}/${quiz.totalQuestions} score`,
        onOpen: () => navigate('/mcqs'),
      });
    });

    labResults.forEach((lab) => {
      const dt = toTimestampDate(lab.createdAt);
      const inWeek = Boolean(dt && isWithinInterval(dt, { start: weekStart, end: weekEnd }));
      items.push({
        id: `lab_${lab.id}`,
        title: lab.experimentTitle,
        subject: lab.subject,
        kind: 'lab',
        durationMinutes: 30,
        completedAt: dt,
        isCurrentWeek: inWeek,
        detailLabel: 'Lab recorded',
        onOpen: () => navigate(`/subject/${lab.subject}`),
      });
    });

    return items.sort(
      (a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
    );
  }, [
    progress,
    effectiveMaterials,
    localStarterCompleted,
    firestoreMaterials.length,
    savedQuizzes,
    labResults,
    navigate,
  ]);

  const avgQuizPct = useMemo(() => {
    if (savedQuizzes.length === 0) return null;
    const sum = savedQuizzes.reduce((acc, q) => {
      const denom = q.totalQuestions > 0 ? q.totalQuestions : 1;
      return acc + (q.score / denom) * 100;
    }, 0);
    return Math.round(sum / savedQuizzes.length);
  }, [savedQuizzes]);

  const labAndQuizTracker = useMemo(() => {
    const labSubjects: Array<{ key: Subject; label: string; route: string }> = [
      { key: 'chemistry', label: 'Chemistry', route: '/subject/chemistry' },
      { key: 'biology', label: 'Biology', route: '/subject/biology' },
      { key: 'physics', label: 'Physics', route: '/subject/physics' },
      { key: 'computer', label: 'CS', route: '/subject/computer' },
      { key: 'math', label: 'Math', route: '/subject/math' },
      { key: 'electrical', label: 'Electrical', route: '/subject/electrical' },
    ];

    const bySubject = labSubjects.map((s) => {
      const labsDone = labResults.filter((l) => l.subject === s.key).length;
      const subjectQuizzes = savedQuizzes.filter((q) =>
        s.key === 'computer'
          ? q.subject === 'computer' || q.subject === 'general' || !['chemistry', 'biology', 'physics', 'math', 'electrical'].includes(q.subject)
          : q.subject === s.key
      );
      const avgQuiz =
        subjectQuizzes.length > 0
          ? Math.round(
              subjectQuizzes.reduce(
                (acc, q) => acc + (q.score / Math.max(1, q.totalQuestions)) * 100,
                0
              ) / subjectQuizzes.length
            )
          : 0;
      const labPct = Math.min(100, Math.round((labsDone / 5) * 100));
      return {
        name: s.label,
        key: s.key,
        route: s.route,
        labsCompleted: labsDone,
        quizzesCompleted: subjectQuizzes.length,
        labCompletionPct: labPct,
        quizMasteryPct: avgQuiz,
      };
    });

    const recentQuizzes = savedQuizzes.slice(0, 8).map((q) => {
      const pct = Math.round((q.score / Math.max(1, q.totalQuestions)) * 100);
      return {
        name: q.title.length > 14 ? `${q.title.slice(0, 14)}...` : q.title,
        fullTitle: q.title,
        subject: q.subject,
        scorePct: pct,
        scoreLabel: `${q.score}/${q.totalQuestions}`,
        questionsCount: q.totalQuestions,
      };
    });

    const hasAnyActivity = labResults.length > 0 || savedQuizzes.length > 0;
    return { bySubject, recentQuizzes, hasAnyActivity };
  }, [labResults, savedQuizzes]);

  const upcomingReminders = useMemo(
    () => reminders.filter((r) => !r.isNotified),
    [reminders]
  );

  const archiveItems = useMemo(() => {
    const quizEntries =
      archiveTab === 'labs'
        ? []
        : savedQuizzes.map((q) => ({
            kind: 'quiz' as const,
            id: q.id,
            title: q.title,
            subject: q.subject,
            scoreLabel: `${q.score}/${q.totalQuestions}`,
            pct: q.totalQuestions > 0 ? Math.round((q.score / q.totalQuestions) * 100) : 0,
            createdAt: toTimestampDate(q.createdAt),
            route: '/mcqs',
          }));

    const labEntries =
      archiveTab === 'quizzes'
        ? []
        : labResults.map((l) => ({
            kind: 'lab' as const,
            id: l.id,
            title: l.experimentTitle,
            subject: l.subject,
            outcome: l.outcome,
            createdAt: toTimestampDate(l.createdAt),
            route: `/subject/${l.subject}`,
          }));

    return [...quizEntries, ...labEntries].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
  }, [archiveTab, savedQuizzes, labResults]);

  const studentRank = useMemo(() => {
    if (!user) return null;
    const idx = leaderboard.findIndex((u) => u.uid === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [leaderboard, user]);

  const handleMaterialComplete = async (material: Material) => {
    if (!user) return;
    if (firestoreMaterials.some((m) => m.id === material.id)) {
      try {
        await dbService.markComplete(user.uid, material.id);
        await Promise.all([
          refreshProfile(),
          dbService.getLeaderboard().then(setLeaderboard).catch(() => {}),
        ]);
      } catch (err) {
        console.error('Failed to mark module complete:', err);
      }
    } else {
      // Starter fallback module tracked locally until mentor content is published
      if (!localStarterCompleted.includes(material.id)) {
        const next = [...localStarterCompleted, material.id];
        setLocalStarterCompleted(next);
        try {
          localStorage.setItem(`starter_completed_${user.uid}`, JSON.stringify(next));
        } catch {
          // Ignore storage write failure
        }
      }
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    setDeletingArchiveId(quizId);
    setArchiveError(null);
    try {
      await learningDataService.deleteSavedQuiz(quizId);
      setSavedQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error('Delete quiz error:', err);
      setArchiveError('Could not remove quiz record. Please try again.');
    } finally {
      setDeletingArchiveId(null);
    }
  };

  const handleDeleteLab = async (resultId: string) => {
    setDeletingArchiveId(resultId);
    setArchiveError(null);
    try {
      await learningDataService.deleteLabResult(resultId);
      setLabResults((prev) => prev.filter((l) => l.id !== resultId));
    } catch (err) {
      console.error('Delete lab result error:', err);
      setArchiveError('Could not remove lab record. Please try again.');
    } finally {
      setDeletingArchiveId(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSubjectFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    subjectFilter !== 'all' ||
    typeFilter !== 'all' ||
    statusFilter !== 'all';

  const points = profile?.points ?? 0;
  const achievements = profile?.achievements ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Workspace Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
            Welcome back, {profile?.displayName || 'Student'}
          </h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Student Workspace</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.username ? `@${profile.username}` : user?.email}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {totalCompleted} of {effectiveMaterials.length} modules completed
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowReminders(true)}
            className="px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Bell size={16} className="text-muted-foreground" />
            <span>Reminders</span>
            {upcomingReminders.length > 0 && (
              <span className="tabular-nums font-semibold text-primary">
                ({upcomingReminders.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/ai-chat')}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageSquare size={16} />
            <span>Ask AI Tutor</span>
          </button>
        </div>
      </header>

      {/* 4-Column Summary KPI Strip */}
      <section aria-label="Study summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label="Points Earned"
          value={points.toLocaleString()}
          detail={
            achievements.length > 0
              ? `${achievements.length} ${achievements.length === 1 ? 'badge' : 'badges'} unlocked`
              : 'Next milestone at 100 pts'
          }
          icon={<Trophy size={18} />}
        />
        <SummaryCard
          label="Curriculum Progress"
          value={`${overallPct}%`}
          detail={`${totalCompleted} / ${effectiveMaterials.length} modules completed`}
          icon={<CheckCircle2 size={18} />}
        />
        <SummaryCard
          label="Quiz Average"
          value={avgQuizPct !== null ? `${avgQuizPct}%` : '—'}
          detail={
            savedQuizzes.length > 0
              ? `Across ${savedQuizzes.length} saved ${savedQuizzes.length === 1 ? 'quiz' : 'quizzes'}`
              : 'No saved quizzes yet'
          }
          icon={<FileQuestion size={18} />}
        />
        <SummaryCard
          label="Labs & Reminders"
          value={String(labResults.length)}
          detail={`${labResults.length === 1 ? '1 lab' : `${labResults.length} labs`} saved · ${upcomingReminders.length} upcoming`}
          icon={<FlaskConical size={18} />}
        />
      </section>

      {/* AI Learning Twin Radar Visualization & Lab Module Suggestions */}
      <AILearningTwin
        userId={user?.uid}
        savedQuizzes={savedQuizzes}
        labResults={labResults}
        progress={progress}
        loading={learningLoading}
      />

      {/* Subjects & Quick Study Tools */}
      <section aria-label="Subjects and study tools" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Subjects &amp; Study Tools
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Jump into interactive notes, virtual labs, or practice tools
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SUBJECT_ORDER.map((subj) => {
            const meta = SUBJECT_META[subj];
            const Icon = meta.icon;
            const subjMaterials = effectiveMaterials.filter((m) => m.subject === subj);
            const subjCompleted = subjMaterials.filter((m) => completedIds.has(m.id)).length;
            const subjPct =
              subjMaterials.length > 0 ? Math.round((subjCompleted / subjMaterials.length) * 100) : 0;

            return (
              <button
                key={subj}
                type="button"
                onClick={() => navigate(`/subject/${subj}`)}
                className="text-left bg-card border border-border rounded-2xl p-5 hover:border-foreground/30 transition-colors flex flex-col justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className={meta.accentText} />
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {meta.label}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{meta.subtitle}</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                    <span>
                      {subjCompleted} / {subjMaterials.length} done
                    </span>
                    <span>{subjPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-300', meta.barColor)}
                      style={{ width: `${subjPct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Study Tools Shortcut Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StudyToolButton
            icon={<MessageSquare size={16} />}
            title="AI Chatbot"
            subtitle="Step-by-step homework help"
            onClick={() => navigate('/ai-chat')}
          />
          <StudyToolButton
            icon={<FileQuestion size={16} />}
            title="MCQ Practice"
            subtitle="Timed quizzes & exam mode"
            onClick={() => navigate('/mcqs')}
          />
          <StudyToolButton
            icon={<ImageIcon size={16} />}
            title="AI Explainer"
            subtitle="Diagram & image breakdown"
            onClick={() => navigate('/explainer')}
          />
          <StudyToolButton
            icon={<AudioLines size={16} />}
            title="Sindhi Voice Explainer"
            subtitle="Ask in Sindhi, learn by voice"
            onClick={() => navigate('/sindhi-voice-explainer')}
          />
        </div>
      </section>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Primary Column: Lab & Quiz Progress Tracker, Priority Materials, Filterable Library, Courses */}
        <div className="xl:col-span-7 space-y-6">
          {/* Lab Experiments & Quizzes Progress Tracker (Recharts) */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Lab Experiments &amp; Quizzes Progress Tracker
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Completion status and mastery across virtual labs and saved MCQ assessments
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setTrackerView('subjects')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    trackerView === 'subjects'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  By Subject
                </button>
                <button
                  type="button"
                  onClick={() => setTrackerView('quizzes')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    trackerView === 'quizzes'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Quiz Scores
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[11px] font-medium text-muted-foreground">Labs Completed</p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                  {labResults.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[11px] font-medium text-muted-foreground">Quizzes Completed</p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                  {savedQuizzes.length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[11px] font-medium text-muted-foreground">Avg Quiz Score</p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                  {avgQuizPct !== null ? `${avgQuizPct}%` : '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <p className="text-[11px] font-medium text-muted-foreground">Bio &amp; Chem Labs</p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">
                  {labResults.filter((l) => l.subject === 'biology' || l.subject === 'chemistry').length}
                </p>
              </div>
            </div>

            {learningLoading ? (
              <div className="h-64 bg-muted animate-pulse rounded-xl" />
            ) : trackerView === 'subjects' ? (
              <div className="space-y-3">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={labAndQuizTracker.bySubject}
                      margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                        tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const row = payload[0]?.payload as (typeof labAndQuizTracker.bySubject)[number] | undefined;
                          if (!row) return null;
                          return (
                            <div className="bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-lg text-xs space-y-1">
                              <p className="font-semibold text-foreground">{row.name}</p>
                              <p className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                                Lab Completion: {row.labCompletionPct}% ({row.labsCompleted} saved)
                              </p>
                              <p className="text-sky-600 dark:text-sky-400 tabular-nums">
                                Quiz Mastery: {row.quizMasteryPct}% ({row.quizzesCompleted} quizzes)
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="labCompletionPct"
                        name="Lab Experiments (%)"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="quizMasteryPct"
                        name="Quiz Avg Score (%)"
                        fill="#38bdf8"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {!labAndQuizTracker.hasAnyActivity && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <span>Save a lab session in Biology/Chemistry or save an MCQ quiz to populate your bars.</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/subject/biology')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
                      >
                        Biology Lab
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/mcqs')}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                      >
                        MCQ Practice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : labAndQuizTracker.recentQuizzes.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-border rounded-xl p-6">
                <p className="text-sm text-muted-foreground">
                  No saved quizzes yet. Complete and save an MCQ session to visualize individual quiz scores.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/mcqs')}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Open MCQ Practice
                </button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={labAndQuizTracker.recentQuizzes}
                    margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const row = payload[0]?.payload as (typeof labAndQuizTracker.recentQuizzes)[number] | undefined;
                        if (!row) return null;
                        return (
                          <div className="bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-lg text-xs space-y-1">
                            <p className="font-semibold text-foreground">{row.fullTitle}</p>
                            <p className="text-muted-foreground capitalize">Subject: {row.subject}</p>
                            <p className="text-sky-600 dark:text-sky-400 font-semibold tabular-nums">
                              Score: {row.scoreLabel} ({row.scorePct}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="scorePct"
                      name="Quiz Score (%)"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Priority Study Materials (only when prioritized items exist) */}
          {(materialsLoading || prioritizedMaterials.length > 0) && (
            <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-500 fill-amber-500 shrink-0" />
                  <h2 className="text-base font-semibold text-foreground">
                    Priority Study Materials
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {materialsLoading ? 'Loading...' : `${prioritizedMaterials.length} highlighted`}
                </span>
              </div>

              {materialsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {prioritizedMaterials.map((m) => (
                    <MaterialRow
                      key={m.id}
                      material={m}
                      isCompleted={completedIds.has(m.id)}
                      isPriority
                      onOpen={() => setSelectedMaterial(m)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Searchable & Filterable Resource Library */}
          <section id="course-resource-library" className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Course &amp; Resource Library
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isUsingStarterFallback
                    ? 'Starter modules loaded · Mentor uploads appear here automatically'
                    : `${effectiveMaterials.length} total study resources across your subjects`}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-primary hover:underline self-start sm:self-auto whitespace-nowrap shrink-0"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lessons, PDFs, or topics..."
                  aria-label="Search study materials"
                  className="w-full pl-10 pr-9 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Subject Filter */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl overflow-x-auto max-w-full">
                  {(['all', ...SUBJECT_ORDER] as const).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSubjectFilter(subj)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                        subjectFilter === subj
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {subj === 'all' ? 'All Subjects' : SUBJECT_META[subj].shortLabel}
                    </button>
                  ))}
                </div>

                {/* Format + Completion Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                    {(['all', 'video', 'pdf', 'book'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTypeFilter(t)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                          typeFilter === t
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t === 'all' ? 'All Types' : t === 'pdf' ? 'PDF' : t === 'video' ? 'Video' : 'Book'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                    {(['all', 'todo', 'completed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={cn(
                          'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                          statusFilter === st
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {st === 'all' ? 'All' : st === 'todo' ? 'To Do' : 'Done'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Materials List */}
            {materialsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="py-12 text-center space-y-3 border-t border-border">
                <p className="text-sm font-medium text-foreground">
                  {hasActiveFilters
                    ? 'No materials match your current filters.'
                    : 'No study materials published yet.'}
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {hasActiveFilters
                    ? 'Try clearing your search or switching subject filters.'
                    : 'Ask your mentor to upload course lessons, or practice directly with AI quizzes and labs.'}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/mcqs')}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Start Practice Quiz
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredMaterials.map((m) => (
                  <MaterialRow
                    key={m.id}
                    material={m}
                    isCompleted={completedIds.has(m.id)}
                    isPriority={Boolean(m.isPrioritized)}
                    onOpen={() => setSelectedMaterial(m)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Active Courses (shown if mentors published courses) */}
          {courses.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-semibold text-foreground">Published Courses</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {courses.length} {courses.length === 1 ? 'course' : 'courses'}
                </span>
              </div>
              <div className="divide-y divide-border">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => navigate(`/subject/${course.subject}`)}
                    className="w-full py-3.5 first:pt-1 last:pb-1 text-left flex items-center justify-between gap-4 hover:opacity-80 transition-opacity"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {SUBJECT_META[course.subject]?.label ?? course.subject}
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-nums">
                          {course.materialIds?.length || 0} modules
                        </span>
                        {course.description ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{course.description}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Secondary Column: Radial Progress & Study Hours, Reminders, Archive, Achievements & Leaderboard */}
        <div className="xl:col-span-5 space-y-6">
          {/* Curriculum Progress & Weekly Study Hours Radial Chart */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Completion &amp; Weekly Study Hours
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                  Current week · {weeklyStudy.weekRangeLabel}
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">
                Target: {weeklyGoalHours}h / week
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-6 h-52 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="92%"
                    barSize={14}
                    data={radialChartData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: 'var(--muted)' }}
                      dataKey="value"
                      cornerRadius={8}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0]?.payload as
                          | { name: string; displayValue: string; value: number }
                          | undefined;
                        if (!item) return null;
                        return (
                          <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            <p className="text-muted-foreground tabular-nums mt-0.5">
                              {item.displayValue} ({item.value}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-foreground tabular-nums leading-none">
                    {overallPct}%
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums mt-1">
                    {weeklyStudy.totalHours.toFixed(1)}h this week
                  </span>
                </div>
              </div>

              <div className="sm:col-span-6 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                      Course Completion
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {overallPct}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums pl-4.5">
                    {totalCompleted} of {effectiveMaterials.length} modules finished
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 shrink-0" />
                      Study Hours (Week)
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {weeklyStudy.totalHours.toFixed(1)}h / {weeklyGoalHours}h
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums pl-4.5">
                    Modules {weeklyStudy.moduleHours}h · Quizzes {weeklyStudy.quizHours}h · Labs {weeklyStudy.labHours}h
                  </p>
                </div>

                {/* Current-week daily study strip */}
                <div className="pt-2 border-t border-border">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">
                    Daily hours logged this week
                  </p>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {weeklyStudy.dailyTotals.map((d) => (
                      <div key={d.label} className="space-y-1">
                        <div className="h-9 bg-muted rounded-md flex items-end overflow-hidden p-0.5">
                          <div
                            className={cn(
                              'w-full rounded-sm transition-all',
                              d.isToday ? 'bg-primary' : 'bg-sky-500/80'
                            )}
                            style={{
                              height: d.hours > 0 ? `${Math.max(18, Math.min(100, (d.hours / 3) * 100))}%` : '0%',
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            'block text-[10px] tabular-nums',
                            d.isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {d.label[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <ProgressBarRow
                label="Video Lessons"
                current={completedVideos}
                total={videoMaterials.length}
                barClass="bg-sky-500"
              />
              <ProgressBarRow
                label="Reading & PDFs"
                current={completedReadings}
                total={readingMaterials.length}
                barClass="bg-violet-500"
              />
              <ProgressBarRow
                label="Overall Curriculum"
                current={totalCompleted}
                total={effectiveMaterials.length}
                barClass="bg-emerald-500"
              />
            </div>
          </section>

          {/* Weekly Goals */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Target size={18} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-base font-semibold text-foreground">Weekly Goals</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {weeklyStudy.weekRangeLabel} · Set your study hours target
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {weeklyStudy.goalPct}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Weekly Study Progress</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {weeklyStudy.totalHours.toFixed(1)} / {weeklyGoalHours} hrs
                </span>
              </div>
              <div
                className="h-2.5 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={weeklyStudy.goalPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Weekly study hours goal progress"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    weeklyStudy.totalHours >= weeklyGoalHours ? 'bg-emerald-500' : 'bg-primary'
                  )}
                  style={{ width: `${weeklyStudy.goalPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 tabular-nums">
                {weeklyStudy.totalHours >= weeklyGoalHours ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Goal achieved ({(weeklyStudy.totalHours - weeklyGoalHours).toFixed(1)} hrs ahead of target)
                    </span>
                  </>
                ) : (
                  <span>
                    {Math.max(0, weeklyGoalHours - weeklyStudy.totalHours).toFixed(1)} hrs remaining to hit your weekly target
                  </span>
                )}
              </p>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Quick presets</span>
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl" role="group" aria-label="Preset weekly study targets">
                  {[5, 10, 15, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => updateWeeklyGoal(preset)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors tabular-nums whitespace-nowrap shrink-0',
                        weeklyGoalHours === preset
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = Number(goalInput);
                  if (!Number.isFinite(parsed) || parsed < 1) {
                    updateWeeklyGoal(1);
                    return;
                  }
                  updateWeeklyGoal(parsed);
                }}
                className="flex items-center gap-2"
              >
                <label htmlFor="weekly-goal-hours-input" className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">
                  Custom target (hrs)
                </label>
                <input
                  id="weekly-goal-hours-input"
                  type="number"
                  min={1}
                  max={80}
                  step={0.5}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
                >
                  Save Goal
                </button>
                {goalSaved && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    Saved
                  </span>
                )}
              </form>
            </div>
          </section>

          {/* Weekly Study Activity Log */}
          <WeeklyStudyActivity
            entries={weeklyActivityEntries}
            loading={materialsLoading || learningLoading}
            weekRangeLabel={weeklyStudy.weekRangeLabel}
            onBrowseLessons={() => {
              document
                .getElementById('course-resource-library')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />

          {/* Upcoming Study Reminders */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Upcoming Reminders</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReminders(true)}
                className="text-xs font-medium text-primary hover:underline whitespace-nowrap shrink-0"
              >
                {reminders.length > 0 ? 'Manage all' : 'Schedule'}
              </button>
            </div>

            {remindersLoading ? (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : upcomingReminders.length === 0 ? (
              <div className="py-5 text-center space-y-2.5 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  No upcoming study reminders scheduled.
                </p>
                <button
                  type="button"
                  onClick={() => setShowReminders(true)}
                  className="px-3.5 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  Schedule Reminder
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcomingReminders.slice(0, 3).map((rem) => {
                  const dt = toTimestampDate(rem.time);
                  return (
                    <div key={rem.id} className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{rem.topic}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {rem.subject}
                          {dt ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="tabular-nums">{format(dt, 'MMM d, h:mm a')}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReminders(true)}
                        className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Learning Archive (Saved Quizzes & Lab Results) */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Learning Archive</h2>
              <div className="flex flex-wrap items-center gap-2">
                {labResults.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadPortfolioLabReportPdf(labResults, {
                        studentName: profile?.displayName || profile?.fullName || undefined,
                        studentEmail: user?.email || undefined,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    title="Download all saved lab experiments as one formatted PDF report"
                  >
                    <FileDown size={13} className="text-primary" />
                    <span>PDF Report</span>
                  </button>
                )}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
                  {(['all', 'quizzes', 'labs'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setArchiveTab(tab)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                        archiveTab === tab
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {tab === 'all' ? 'All' : tab === 'quizzes' ? 'Quizzes' : 'Labs'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {archiveError && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {archiveError}
              </p>
            )}

            {learningLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : archiveItems.length === 0 ? (
              <div className="py-6 text-center space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {archiveTab === 'quizzes'
                    ? 'No saved quizzes yet. Generate and save a quiz to track your scores.'
                    : archiveTab === 'labs'
                      ? 'No virtual lab experiments saved yet.'
                      : 'Complete a practice quiz or save a virtual lab observation to see your history here.'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/mcqs')}
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Take a Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/subject/chemistry')}
                    className="px-3.5 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    Open Virtual Lab
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {archiveItems.slice(0, 6).map((item) => (
                  <div
                    key={`${item.kind}_${item.id}`}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="min-w-0 flex-1 text-left flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        {item.kind === 'quiz' ? <FileQuestion size={16} /> : <FlaskConical size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate capitalize">
                          {item.kind === 'quiz' ? 'Quiz' : 'Lab'}
                          <span aria-hidden="true"> · </span>
                          {item.subject}
                          {item.createdAt ? (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="tabular-nums">{format(item.createdAt, 'MMM d')}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.kind === 'quiz' ? (
                        <span className="text-xs font-semibold text-foreground tabular-nums">
                          {item.scoreLabel} ({item.pct}%)
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const lab = labResults.find((r) => r.id === item.id);
                              if (!lab) return;
                              downloadSingleLabReportPdf(lab, {
                                studentName: profile?.displayName || profile?.fullName || undefined,
                                studentEmail: user?.email || undefined,
                              });
                            }}
                            title="Download PDF lab report"
                            className="px-2 py-1 rounded-lg border border-border bg-muted/50 hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1 whitespace-nowrap"
                          >
                            <FileDown size={12} className="text-primary" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(item.route)}
                            className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                          >
                            Open
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={deletingArchiveId === item.id}
                        onClick={() =>
                          item.kind === 'quiz' ? handleDeleteQuiz(item.id) : handleDeleteLab(item.id)
                        }
                        aria-label={`Delete ${item.title}`}
                        title="Remove from archive"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Achievements & Class Leaderboard */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-primary" />
                  <h2 className="text-base font-semibold text-foreground">Achievements</h2>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {achievements.length} earned
                </span>
              </div>

              {achievements.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Complete modules to earn points and unlock your first badge at 100 points.
                </p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-foreground">
                  {achievements.map((badge) => (
                    <span key={badge} className="inline-flex items-center gap-1.5">
                      <Award size={13} className="text-primary shrink-0" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Student Leaderboard</h3>
                </div>
                {studentRank !== null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Your rank: #{studentRank}
                  </span>
                )}
              </div>

              {leaderboardLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Leaderboard rankings will appear as students earn points.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {leaderboard.slice(0, 5).map((learner, index) => {
                    const isSelf = learner.uid === user?.uid;
                    return (
                      <div
                        key={learner.uid}
                        className={cn(
                          'py-2.5 flex items-center justify-between gap-3 text-sm',
                          isSelf && 'font-semibold text-primary'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 text-xs text-muted-foreground tabular-nums shrink-0">
                            #{index + 1}
                          </span>
                          <span className="truncate">
                            {learner.displayName}
                            {isSelf ? ' (You)' : ''}
                          </span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums shrink-0">
                          {(learner.points ?? 0).toLocaleString()} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Material Viewer Modal */}
      <AnimatePresence>
        {selectedMaterial && (
          <MaterialViewer
            material={selectedMaterial}
            isCompleted={completedIds.has(selectedMaterial.id)}
            onClose={() => setSelectedMaterial(null)}
            onComplete={() => {
              handleMaterialComplete(selectedMaterial);
            }}
          />
        )}
      </AnimatePresence>

      {/* Study Reminders Modal */}
      <AnimatePresence>
        {showReminders && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="max-w-2xl w-full max-h-[85vh] overflow-y-auto bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-2xl relative custom-scrollbar"
            >
              <button
                type="button"
                onClick={() => setShowReminders(false)}
                aria-label="Close reminders"
                className="absolute top-5 right-5 p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <CloseIcon size={20} />
              </button>
              <StudyReminders />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Due Study Reminder Notification */}
      <AnimatePresence>
        {activeNotification && (
          <div className="fixed bottom-6 right-6 z-[500] max-w-sm w-[calc(100vw-3rem)]">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="p-6 bg-card border border-border rounded-2xl shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Bell size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground capitalize">
                      Study Reminder · {activeNotification.subject}
                    </p>
                    <h4 className="text-base font-semibold text-foreground">
                      {activeNotification.topic}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNotification(null)}
                  aria-label="Dismiss reminder"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveNotification(null)}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
      </div>
    </div>
  );
}

function StudyToolButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-card border border-border rounded-xl px-4 py-3 hover:border-foreground/30 transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
      <ChevronRight
        size={15}
        className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
      />
    </button>
  );
}

function MaterialRow({
  material,
  isCompleted,
  isPriority,
  onOpen,
}: {
  material: Material;
  isCompleted: boolean;
  isPriority: boolean;
  onOpen: () => void;
}) {
  const safeUrl = getSafeHttpUrl(material.url);
  const subjectLabel = SUBJECT_META[material.subject]?.label ?? material.subject;
  const typeLabel =
    material.type === 'video' ? 'Video' : material.type === 'pdf' ? 'PDF' : 'Book';

  return (
    <div className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <button
        type="button"
        onClick={onOpen}
        className="flex items-start gap-3.5 text-left min-w-0 flex-1 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0 mt-0.5">
          {material.type === 'video' ? (
            <Video size={18} />
          ) : material.type === 'pdf' ? (
            <FileText size={18} />
          ) : (
            <BookOpen size={18} />
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {material.title}
            </h3>
            {isPriority && (
              <Star size={13} className="text-amber-500 fill-amber-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1.5">
            <span>{subjectLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{typeLabel}</span>
            {isCompleted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Completed
                </span>
              </>
            )}
          </p>
          {material.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{material.description}</p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {safeUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Open resource in new tab"
            aria-label={`Open ${material.title} in new tab`}
          >
            {material.type === 'pdf' ? <Download size={15} /> : <ExternalLink size={15} />}
          </a>
        )}
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0',
            isCompleted
              ? 'bg-muted text-foreground hover:bg-muted/80'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          )}
        >
          <Play size={13} />
          <span>{isCompleted ? 'Review' : 'Open'}</span>
        </button>
      </div>
    </div>
  );
}

function ProgressBarRow({
  label,
  current,
  total,
  barClass,
}: {
  label: string;
  current: number;
  total: number;
  barClass: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {current}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
