import React, { useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, Loader2, ChevronDown, ChevronUp, BarChart3, FileSpreadsheet } from 'lucide-react';
import { aiService } from '../services/ai';
import { useLanguage } from '../hooks/useLanguage';
import type { Course, Material, UserProfile } from '../types';

type TeacherTask = 'Lesson Plan' | 'Practice Worksheet' | 'MCQ Assessment Sheet' | 'Homework Assignment';

export const MentorAIAssistant: React.FC<{
  students: UserProfile[];
  materials: Material[];
  courses: Course[];
}> = ({ students, materials, courses }) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState<TeacherTask>('Lesson Plan');
  const [subject, setSubject] = useState('Physics');
  const [topic, setTopic] = useState('Conservation of Momentum & Collisions');
  const [gradeLevel, setGradeLevel] = useState('Grade 10 / Secondary STEM');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classAnalytics = useMemo(() => {
    const totalPoints = students.reduce((sum, s) => sum + (s.points || 0), 0);
    const avgPoints = students.length > 0 ? Math.round(totalPoints / students.length) : 0;
    const badgeCount = students.reduce((sum, s) => sum + (s.achievements?.length || 0), 0);
    const topStudent = [...students].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
    return {
      avgPoints,
      badgeCount,
      topStudentName: topStudent?.displayName || '—',
      materialsPerCourse: courses.length > 0 ? (materials.length / courses.length).toFixed(1) : String(materials.length),
    };
  }, [students, materials.length, courses.length]);

  const handleGenerate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const text = await aiService.labAssistant({
        action: 'teacher-assistant',
        subject,
        topic: `${taskType}: ${topic}`,
        context: `Grade/Level: ${gradeLevel}. Cohort context: ${students.length} students enrolled (avg ${classAnalytics.avgPoints} XP), ${materials.length} published resources across ${courses.length} courses.`,
        language,
      });
      setOutput(text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to generate teaching material.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card border-2 border-border rounded-3xl shadow-sm overflow-hidden mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
              AI Teacher Assistant &amp; Class Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Generate lesson plans, worksheets, MCQs, assignments, and inspect live student engagement metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-primary shrink-0">
          <span>{open ? 'Collapse' : 'Open Studio'}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="p-6 pt-2 border-t border-border space-y-6">
          {/* Live Class Analytics Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                <BarChart3 size={12} className="text-primary" />
                <span>Cohort Avg XP</span>
              </div>
              <p className="text-xl font-black mt-1">{classAnalytics.avgPoints} pts</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Total Badges Unlocked
              </p>
              <p className="text-xl font-black mt-1">{classAnalytics.badgeCount}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Top Cohort Performer
              </p>
              <p className="text-sm font-black mt-1 truncate">{classAnalytics.topStudentName}</p>
            </div>
            <div className="p-4 rounded-2xl bg-muted/40 border border-border">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Resources / Course
              </p>
              <p className="text-xl font-black mt-1">{classAnalytics.materialsPerCourse}</p>
            </div>
          </div>

          {/* Generator Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TeacherTask)}
              className="bg-muted border border-border rounded-xl px-3 py-2.5 text-xs font-bold"
            >
              <option value="Lesson Plan">Lesson Plan</option>
              <option value="Practice Worksheet">Practice Worksheet</option>
              <option value="MCQ Assessment Sheet">MCQ Assessment Sheet</option>
              <option value="Homework Assignment">Homework Assignment</option>
            </select>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-muted border border-border rounded-xl px-3 py-2.5 text-xs font-bold"
            >
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Biology">Biology</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
            </select>
            <input
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="Grade / Class Level"
              className="bg-muted border border-border rounded-xl px-3 py-2.5 text-xs"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter chapter, standard, or topic..."
              className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              <span>Generate {taskType}</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-500">
              {error}
            </div>
          )}

          {output && (
            <div className="p-5 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none max-h-[420px] overflow-y-auto">
              <Markdown>{output}</Markdown>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
