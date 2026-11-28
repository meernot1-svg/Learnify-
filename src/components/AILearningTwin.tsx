import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  FlaskConical,
  Sparkles,
  Target,
} from 'lucide-react';
import type { LabResult, Progress, SavedQuiz } from '../types';
import { buildLearningTwinSnapshot, type TopicMasteryNode } from '../lib/learningAnalytics';

export interface AILearningTwinProps {
  userId?: string;
  savedQuizzes: SavedQuiz[];
  labResults: LabResult[];
  progress: Progress[];
  loading?: boolean;
  compact?: boolean;
}

type ConfidenceLevel = 'needs-practice' | 'improving' | 'confident';

const CONFIDENCE_LABELS: Record<ConfidenceLevel, { label: string; badgeClass: string }> = {
  'needs-practice': {
    label: 'Needs Practice',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  improving: {
    label: 'Improving',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  confident: {
    label: 'Confident',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
};

function getEvidenceStageLabel(node: TopicMasteryNode): string {
  if (node.quizzesCount === 0 && node.labsCompleted === 0) return 'Not Studied';
  if (node.masteryScore >= 75) return 'Mastered';
  if (node.masteryScore >= 45) return 'Improving';
  return 'Needs Practice';
}

export const AILearningTwin: React.FC<AILearningTwinProps> = ({
  userId,
  savedQuizzes,
  labResults,
  progress,
  loading = false,
  compact = false,
}) => {
  const navigate = useNavigate();

  const snapshot = useMemo(
    () => buildLearningTwinSnapshot(savedQuizzes, labResults, progress),
    [savedQuizzes, labResults, progress]
  );

  const [selectedSubject, setSelectedSubject] = useState<string>(snapshot.weakestSubject.subject);
  const [showQuizOverlay, setShowQuizOverlay] = useState<boolean>(true);
  const [confidenceMap, setConfidenceMap] = useState<Record<string, ConfidenceLevel>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`twin_confidence_${userId || 'anon'}`);
      setConfidenceMap(raw ? (JSON.parse(raw) as Record<string, ConfidenceLevel>) : {});
    } catch {
      setConfidenceMap({});
    }
  }, [userId]);

  useEffect(() => {
    if (!snapshot.nodes.some((n) => n.subject === selectedSubject)) {
      setSelectedSubject(snapshot.weakestSubject.subject);
    }
  }, [snapshot, selectedSubject]);

  const setSubjectConfidence = (subj: string, level: ConfidenceLevel) => {
    const next = { ...confidenceMap, [subj]: level };
    setConfidenceMap(next);
    try {
      localStorage.setItem(`twin_confidence_${userId || 'anon'}`, JSON.stringify(next));
    } catch {
      // Ignore storage limits
    }
  };

  const radarData = useMemo(
    () =>
      snapshot.nodes.map((node) => ({
        subjectKey: node.subject,
        subject: node.label.replace('Computer Science', 'Comp. Sci').replace('Electrical Eng.', 'Electrical'),
        fullLabel: node.label,
        mastery: node.masteryScore,
        quizAvg: node.quizAverage,
        labs: node.labsCompleted,
      })),
    [snapshot.nodes]
  );

  const activeNode =
    snapshot.nodes.find((n) => n.subject === selectedSubject) || snapshot.weakestSubject;

  const weakSpotNodes = useMemo(
    () =>
      [...snapshot.nodes]
        .sort((a, b) => a.masteryScore - b.masteryScore)
        .slice(0, 3),
    [snapshot.nodes]
  );

  const activeConfidence = confidenceMap[String(activeNode.subject)];

  return (
    <section
      aria-label="AI Learning Twin Topic Mastery Radar"
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Brain size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                AI Learning Twin
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary tabular-nums">
                <Target size={12} />
                Readiness {snapshot.overallReadiness}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dynamic mastery map built from {savedQuizzes.length} saved quiz{savedQuizzes.length === 1 ? '' : 'zes'},{' '}
              {labResults.length} virtual lab{labResults.length === 1 ? '' : 's'}, and {progress.length} module{progress.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowQuizOverlay((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              showQuizOverlay
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {showQuizOverlay ? 'Showing Quiz Overlay' : 'Show Quiz Overlay'}
          </button>
          {!compact && (
            <button
              type="button"
              onClick={() => navigate('/learn-hub')}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Misconception &amp; Quest Hub</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-[290px] flex items-center justify-center text-xs text-muted-foreground">
          Synchronizing topic mastery radar from your learning records...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Radar Chart */}
          <div className="lg:col-span-6 space-y-3">
            <div className="bg-muted/25 border border-border rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  STEM Mastery Radar (0–100%)
                </span>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                    Overall Mastery
                  </span>
                  {showQuizOverlay && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Quiz Avg
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-[270px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                    <PolarGrid stroke="currentColor" className="text-border" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                      className="text-foreground"
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: 'currentColor', fontSize: 9 }}
                      className="text-muted-foreground"
                    />
                    <Radar
                      name="Topic Mastery (%)"
                      dataKey="mastery"
                      stroke="#f4b400"
                      strokeWidth={2.5}
                      fill="#f4b400"
                      fillOpacity={0.28}
                    />
                    {showQuizOverlay && (
                      <Radar
                        name="Quiz Average (%)"
                        dataKey="quizAvg"
                        stroke="#10b981"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        fill="#10b981"
                        fillOpacity={0.12}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card, #111827)',
                        borderColor: 'var(--color-border, #374151)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Pills to Inspect Individual Twin Nodes */}
            <div className="flex flex-wrap gap-1.5">
              {snapshot.nodes.map((node) => {
                const active = node.subject === activeNode.subject;
                return (
                  <button
                    key={String(node.subject)}
                    type="button"
                    onClick={() => setSelectedSubject(String(node.subject))}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer tabular-nums ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {node.label} · {node.masteryScore}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Weak Spot Diagnostics + Targeted Lab Recommendations */}
          <div className="lg:col-span-6 space-y-4">
            {/* Active Subject Inspector & Suggested Lab Modules */}
            <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                    Selected Twin Focus
                  </span>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>{activeNode.label}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      {getEvidenceStageLabel(activeNode)}
                    </span>
                  </h3>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-xl font-black text-foreground">{activeNode.masteryScore}%</span>
                  <p className="text-[10px] text-muted-foreground">
                    Quiz {activeNode.quizAverage}% · {activeNode.labsCompleted} lab{activeNode.labsCompleted === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {activeNode.weakTopics.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Topics needing reinforcement: </span>
                    <span className="text-muted-foreground">{activeNode.weakTopics.join(', ')}</span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-muted/60 border border-border text-xs flex items-start gap-2">
                  <Sparkles size={15} className="text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">
                    {activeNode.labsCompleted === 0
                      ? `Complete an interactive ${activeNode.label} lab module below to raise practical mastery above ${activeNode.masteryScore}%.`
                      : `Strong momentum in ${activeNode.label}. Pair a targeted simulation with a short diagnostic quiz.`}
                  </span>
                </div>
              )}

              {/* Specific Lab Module Suggestions */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FlaskConical size={13} className="text-primary" />
                  <span>Suggested Lab Modules to Reinforce Understanding</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {activeNode.suggestedModules.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => navigate(mod.route)}
                      className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {mod.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{mod.focus}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary shrink-0">
                        <span>Launch Lab</span>
                        <ArrowRight size={12} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Self-Assessment Confidence Calibration */}
              <div className="pt-2 border-t border-border/70 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Self-check confidence:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['needs-practice', 'improving', 'confident'] as ConfidenceLevel[]).map((lvl) => {
                    const meta = CONFIDENCE_LABELS[lvl];
                    const selected = activeConfidence === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSubjectConfidence(String(activeNode.subject), lvl)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          selected
                            ? meta.badgeClass
                            : 'bg-background border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {selected && <CheckCircle2 size={10} className="inline mr-1" />}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Priority Weak Spots Strip */}
            <div className="rounded-2xl bg-muted/20 border border-border p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Priority Weak Spots &amp; Next Actions
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/mcqs')}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Run Diagnostic Quiz
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {weakSpotNodes.map((node) => (
                  <button
                    key={String(node.subject)}
                    type="button"
                    onClick={() => navigate(node.recommendedLabRoute)}
                    className="text-left p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors space-y-1 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground truncate">{node.label}</span>
                      <span className="text-[11px] font-black text-amber-500 tabular-nums">
                        {node.masteryScore}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      Try: {node.suggestedModules[0]?.title || node.recommendedLabName}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AILearningTwin;
