import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { LearningTwinSnapshot } from '../lib/learningAnalytics';

interface StudyTask {
  id: string;
  title: string;
  durationMin: number;
  route: string;
  done: boolean;
}

export const CompetitionDemoPanel: React.FC<{
  userId?: string;
  twin: LearningTwinSnapshot;
}> = ({ userId, twin }) => {
  const navigate = useNavigate();

  // --- Section 27: Zero-Setup Competition Demonstration Journey ---
  const [demoStep, setDemoStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [diagChoice, setDiagChoice] = useState<number | null>(null);
  const [voltage, setVoltage] = useState<number>(12);
  const [resistance, setResistance] = useState<number>(4);
  const [followupChoice, setFollowupChoice] = useState<number | null>(null);

  const currentAmps = +(voltage / Math.max(1, resistance)).toFixed(2);
  const powerWatts = +(voltage * currentAmps).toFixed(1);

  // --- Section 21: Personalised Daily Study Planner ---
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`study_plan_done_${userId || 'anon'}`);
      setCompletedTaskIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setCompletedTaskIds([]);
    }
  }, [userId]);

  const toggleTask = (id: string) => {
    const next = completedTaskIds.includes(id)
      ? completedTaskIds.filter((x) => x !== id)
      : [...completedTaskIds, id];
    setCompletedTaskIds(next);
    try {
      localStorage.setItem(`study_plan_done_${userId || 'anon'}`, JSON.stringify(next));
    } catch {
      // Ignore storage limits
    }
  };

  const studyTasks: StudyTask[] = useMemo(() => {
    const sorted = [...twin.nodes].sort((a, b) => a.masteryScore - b.masteryScore);
    const first = sorted[0];
    const second = sorted[1] || sorted[0];
    const block1 = Math.max(15, Math.round(dailyMinutes * 0.45));
    const block2 = Math.max(10, Math.round(dailyMinutes * 0.35));
    const block3 = Math.max(5, dailyMinutes - block1 - block2);

    return [
      {
        id: `plan_lab_${first.subject}`,
        title: `Run ${first.suggestedModules[0]?.title || first.recommendedLabName} (${first.label} focus)`,
        durationMin: block1,
        route: first.recommendedLabRoute,
        done: completedTaskIds.includes(`plan_lab_${first.subject}`),
      },
      {
        id: `plan_quiz_${second.subject}`,
        title: `Attempt 10 practice MCQs on ${second.label} & review explanations`,
        durationMin: block2,
        route: '/mcqs',
        done: completedTaskIds.includes(`plan_quiz_${second.subject}`),
      },
      {
        id: 'plan_viva_review',
        title: 'Summarize today’s lab findings & listen to a Sindhi voice review',
        durationMin: block3,
        route: '/sindhi-voice-explainer',
        done: completedTaskIds.includes('plan_viva_review'),
      },
    ];
  }, [twin.nodes, dailyMinutes, completedTaskIds]);

  const resetDemo = () => {
    setDemoStep(1);
    setDiagChoice(null);
    setVoltage(12);
    setResistance(4);
    setFollowupChoice(null);
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Section 21: Personalised Study Planner */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <CalendarCheck2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Personalised Daily Study Planner</h2>
              <p className="text-xs text-muted-foreground">
                Flexible plan tailored to your weakest topics and chosen daily study budget
              </p>
            </div>
          </div>

          <select
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
            className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs font-bold"
          >
            <option value={30}>30 min / day</option>
            <option value={60}>60 min / day</option>
            <option value={90}>90 min / day</option>
            <option value={120}>120 min / day</option>
          </select>
        </div>

        <div className="space-y-2.5">
          {studyTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3.5 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
                task.done
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-muted/35 border-border'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 accent-primary"
                />
                <div className="min-w-0">
                  <p className={`text-xs font-bold ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{task.durationMin} minutes allocated</p>
                </div>
              </label>
              <button
                type="button"
                onClick={() => navigate(task.route)}
                className="px-2.5 py-1.5 rounded-xl bg-background border border-border text-[11px] font-bold hover:border-primary shrink-0 cursor-pointer"
              >
                Open
              </button>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Completed {studyTasks.filter((t) => t.done).length} of {studyTasks.length} scheduled blocks today. Adjust your study duration anytime.
        </p>
      </div>

      {/* Section 27: Competition Demonstration Mode (No API key required) */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Guided Science Demo Tour</h2>
              <p className="text-xs text-muted-foreground">
                End-to-end LearnLab loop: Diagnose → Explain → Simulate → Verify (works offline)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetDemo}
            className="p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground cursor-pointer"
            title="Restart Demo Tour"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                demoStep >= s ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {demoStep === 1 && (
          <div className="p-4 rounded-2xl bg-muted/35 border border-border space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Step 1 · Diagnostic Question (Physics — Ohm’s Law)
            </span>
            <p className="text-xs font-bold">
              If battery voltage stays constant at 12 V and circuit resistance doubles from 4 Ω to 8 Ω, what happens to the current?
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                'Current doubles (increases from 3 A to 6 A)',
                'Current cuts in half (decreases from 3 A to 1.5 A)',
                'Current remains unchanged at 3 A',
              ].map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setDiagChoice(idx);
                    setDemoStep(2);
                  }}
                  className="text-left px-3 py-2 rounded-xl bg-background border border-border hover:border-primary text-xs font-medium cursor-pointer"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {demoStep === 2 && (
          <div className="p-4 rounded-2xl bg-muted/35 border border-border space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Step 2 · AI Misconception Diagnosis
            </span>
            {diagChoice === 1 ? (
              <p className="text-xs text-emerald-500 font-bold">
                Great intuition! By Ohm’s Law (I = V / R), current is inversely proportional to resistance when voltage is constant. Let’s verify it live in the simulator.
              </p>
            ) : (
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-rose-500">
                  Possible Conceptual Misconception Detected:
                </p>
                <p className="text-muted-foreground">
                  Students sometimes confuse resistance with driving force. Higher resistance opposes charge flow, so with fixed voltage (12 V), doubling resistance reduces current by half (I = V / R).
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setDemoStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
            >
              <Play size={13} />
              <span>Test in Interactive Circuit Lab</span>
            </button>
          </div>
        )}

        {demoStep === 3 && (
          <div className="p-4 rounded-2xl bg-muted/35 border border-border space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Step 3 · Live Ohm’s Law Simulation (I = V / R)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold space-y-1">
                <span>Voltage (V): {voltage} V</span>
                <input
                  type="range"
                  min={2}
                  max={24}
                  value={voltage}
                  onChange={(e) => setVoltage(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
              <label className="text-xs font-bold space-y-1">
                <span>Resistance (R): {resistance} Ω</span>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={resistance}
                  onChange={(e) => setResistance(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between text-xs font-bold">
              <span>Calculated Current: {currentAmps} A</span>
              <span>Power: {powerWatts} W</span>
            </div>
            <button
              type="button"
              onClick={() => setDemoStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
            >
              <span>Proceed to Verification Check</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {demoStep === 4 && (
          <div className="p-4 rounded-2xl bg-muted/35 border border-border space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Step 4 · Mastery Verification Check
            </span>
            <p className="text-xs font-bold">
              Based on your simulation readings, if you keep R = 6 Ω and raise Voltage from 6 V to 18 V, what happens to Current?
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                'It triples from 1 A to 3 A',
                'It drops to 0.33 A',
              ].map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setFollowupChoice(idx);
                    setDemoStep(5);
                  }}
                  className="text-left px-3 py-2 rounded-xl bg-background border border-border hover:border-primary text-xs font-medium cursor-pointer"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {demoStep === 5 && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
              <CheckCircle2 size={16} />
              <span>
                {followupChoice === 0
                  ? 'Concept Verified! Ohm’s Law Mastery Reinforced.'
                  : 'Review Tip: Current scales linearly with Voltage (18 V / 6 Ω = 3 A).'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Learning Twin tracks lab completions and diagnostic checks dynamically. Next recommended full lab:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/subject/electrical?tab=tool')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                <FlaskConical size={13} />
                <span>Open Full Circuit Lab</span>
              </button>
              <button
                type="button"
                onClick={resetDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background border border-border text-xs font-bold cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Replay Demo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompetitionDemoPanel;
