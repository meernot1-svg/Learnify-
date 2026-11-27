import React, { useEffect, useState } from 'react';
import { BellRing, Pause, Play, Plus, RotateCcw, Timer } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExperimentCountdownTimerProps {
  subject: 'biology' | 'chemistry';
  onLogTimedSession?: (elapsedSeconds: number) => void;
}

const PRESET_MINUTES = [2, 5, 10, 15];

function playCompletionTone() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
  } catch {
    // Ignore audio context restriction errors
  }
}

export default function ExperimentCountdownTimer({
  subject,
  onLogTimedSession,
}: ExperimentCountdownTimerProps) {
  const defaultSeconds = subject === 'chemistry' ? 300 : 600;
  const [totalSeconds, setTotalSeconds] = useState<number>(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(defaultSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>(String(defaultSeconds / 60));

  useEffect(() => {
    const nextDefault = subject === 'chemistry' ? 300 : 600;
    setTotalSeconds(nextDefault);
    setRemainingSeconds(nextDefault);
    setIsRunning(false);
    setIsCompleted(false);
    setCustomMinutes(String(nextDefault / 60));
  }, [subject]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          setIsCompleted(true);
          playCompletionTone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const applyMinutes = (mins: number) => {
    const clamped = Math.min(120, Math.max(1, Math.round(mins)));
    const secs = clamped * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    setIsRunning(false);
    setIsCompleted(false);
    setCustomMinutes(String(clamped));
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(customMinutes);
    if (Number.isFinite(parsed) && parsed >= 1) {
      applyMinutes(parsed);
    }
  };

  const handleAddMinute = () => {
    setTotalSeconds((prev) => Math.max(prev, remainingSeconds + 60));
    setRemainingSeconds((prev) => prev + 60);
    setIsCompleted(false);
  };

  const handleReset = () => {
    setRemainingSeconds(totalSeconds);
    setIsRunning(false);
    setIsCompleted(false);
  };

  const formatCountdown = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const rem = secs % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const progressRatio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressRatio);

  const isWarning = !isCompleted && progressRatio <= 0.25 && remainingSeconds > 15;
  const isCritical = isCompleted || remainingSeconds <= 15;

  const ringStroke = isCritical
    ? '#ef4444'
    : isWarning
      ? '#f59e0b'
      : subject === 'biology'
        ? '#10b981'
        : '#06b6d4';

  return (
    <div
      className={cn(
        'w-full rounded-2xl border px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 transition-colors',
        isCompleted
          ? 'bg-red-950/50 border-red-500/50'
          : 'bg-slate-900/90 border-white/10'
      )}
    >
      {/* Left: Visual Circular Countdown Gauge & Readout */}
      <div className="flex items-center gap-3.5">
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="4.5"
            />
            <circle
              cx="30"
              cy="30"
              r={radius}
              fill="none"
              stroke={ringStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500 ease-linear"
            />
          </svg>
          <span
            className={cn(
              'absolute text-[11px] font-black tabular-nums tracking-tight',
              isCritical ? 'text-red-400' : 'text-white'
            )}
          >
            {Math.round(progressRatio * 100)}%
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Timer
              size={14}
              className={cn(
                subject === 'biology' ? 'text-emerald-400' : 'text-cyan-400',
                isRunning && 'animate-pulse'
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              {subject === 'biology' ? 'Biology' : 'Chemistry'} Experiment Timer
            </span>
            {isCompleted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold">
                <BellRing size={11} />
                Time Up
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2.5 mt-0.5">
            <span
              className={cn(
                'text-2xl sm:text-3xl font-black tabular-nums tracking-tight leading-none',
                isCompleted
                  ? 'text-red-400 animate-pulse'
                  : isWarning
                    ? 'text-amber-300'
                    : 'text-white'
              )}
            >
              {formatCountdown(remainingSeconds)}
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              / {formatCountdown(totalSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Presets + Custom Minutes */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 rounded-xl p-1">
          {PRESET_MINUTES.map((mins) => {
            const active = totalSeconds === mins * 60;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => applyMinutes(mins)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors tabular-nums',
                  active
                    ? subject === 'biology'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                {mins}m
              </button>
            );
          })}
        </div>

        <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={120}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            aria-label="Custom experiment timer minutes"
            className="w-14 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-white/10 text-xs text-white text-center font-bold tabular-nums focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-200 hover:bg-white/10 transition-colors"
          >
            Set min
          </button>
        </form>
      </div>

      {/* Right: Playback & Log Controls */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (remainingSeconds === 0) {
              setRemainingSeconds(totalSeconds);
              setIsCompleted(false);
            }
            setIsRunning((prev) => !prev);
          }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors',
            isRunning
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
              : subject === 'biology'
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          )}
        >
          {isRunning ? <Pause size={14} /> : <Play size={14} />}
          <span>{isRunning ? 'Pause' : remainingSeconds === 0 ? 'Restart' : 'Start'}</span>
        </button>

        <button
          type="button"
          onClick={handleAddMinute}
          title="Add 1 minute"
          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-bold text-slate-200 hover:text-white hover:border-white/25 transition-colors"
        >
          <Plus size={13} />
          <span>1m</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          title="Reset timer"
          aria-label="Reset experiment timer"
          className="p-2 rounded-xl bg-slate-950/80 border border-white/10 text-slate-300 hover:text-white hover:border-white/25 transition-colors"
        >
          <RotateCcw size={14} />
        </button>

        {onLogTimedSession && (
          <button
            type="button"
            onClick={() => onLogTimedSession(Math.max(1, totalSeconds - remainingSeconds))}
            className="px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 text-[11px] font-bold transition-colors"
          >
            Log Session
          </button>
        )}
      </div>
    </div>
  );
}
