import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Markdown from 'react-markdown';
import {
  Brain,
  CheckCircle2,
  Compass,
  Download,
  Flame,
  Gauge,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trophy,
  Wifi,
  WifiOff,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage, LANGUAGE_OPTIONS, type AppLanguage } from '../hooks/useLanguage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { dbService } from '../services/db';
import { learningDataService } from '../services/learningData';
import { aiService } from '../services/ai';
import { buildLearningTwinSnapshot } from '../lib/learningAnalytics';
import AILearningTwin from './AILearningTwin';
import CompetitionDemoPanel from './CompetitionDemoPanel';
import {
  BUILTIN_STUDY_PACKS,
  downloadStudyPackFile,
  flushOfflineQueue,
  getOfflineQueue,
  getSavedStudyPacks,
  isLowBandwidthMode,
  OFFLINE_SYNC_EVENT,
  saveStudyPackOffline,
  setLowBandwidthMode,
} from '../lib/offlineSync';
import type { LabResult, Progress, SavedQuiz } from '../types';

export default function LearnLabHub() {
  const { user, profile, refreshProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Misconception Detector state
  const [miscSubject, setMiscSubject] = useState('physics');
  const [miscQuestion, setMiscQuestion] = useState('Heavier objects fall faster than lighter objects in a vacuum.');
  const [miscStudentIdea, setMiscStudentIdea] = useState('I thought weight pulls heavier objects down faster regardless of air resistance.');
  const [miscDiagnosis, setMiscDiagnosis] = useState('');
  const [miscFollowup, setMiscFollowup] = useState('');
  const [miscVerification, setMiscVerification] = useState('');
  const [miscLoading, setMiscLoading] = useState(false);
  const [miscError, setMiscError] = useState<string | null>(null);

  // Local Science Explorer state
  const [localSubject, setLocalSubject] = useState('chemistry');
  const [localTopic, setLocalTopic] = useState('Natural pH indicators using red cabbage or turmeric');
  const [localResult, setLocalResult] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  // Science Quest reward claims
  const [claimedQuests, setClaimedQuests] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`claimed_quests_${user?.uid || 'anon'}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`claimed_quests_${user?.uid || 'anon'}`);
      setClaimedQuests(raw ? JSON.parse(raw) : []);
    } catch {
      setClaimedQuests([]);
    }
  }, [user?.uid]);

  // Offline & Low-bandwidth state
  const [savedPacks, setSavedPacks] = useState(() => getSavedStudyPacks());
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => getOfflineQueue().length);
  const [lowBandwidth, setLowBandwidth] = useState(() => isLowBandwidthMode());
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const refreshOffline = () => {
      setSavedPacks(getSavedStudyPacks());
      setOfflineQueueCount(getOfflineQueue().length);
    };
    window.addEventListener(OFFLINE_SYNC_EVENT, refreshOffline);
    return () => window.removeEventListener(OFFLINE_SYNC_EVENT, refreshOffline);
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    Promise.all([
      learningDataService.getSavedQuizzes(user.uid).then((l) => l.slice(0, 40)).catch(() => []),
      learningDataService.getLabResults(user.uid).then((l) => l.slice(0, 40)).catch(() => []),
      dbService.getStudentProgress(user.uid).catch(() => []),
    ])
      .then(([quizzes, labs, prog]) => {
        setSavedQuizzes(quizzes);
        setLabResults(labs);
        setProgress(prog);
      })
      .finally(() => setLoadingData(false));
  }, [user?.uid]);

  const twin = useMemo(
    () => buildLearningTwinSnapshot(savedQuizzes, labResults, progress),
    [savedQuizzes, labResults, progress]
  );

  const handleDiagnoseMisconception = async () => {
    if (!miscQuestion.trim() || miscLoading) return;
    setMiscLoading(true);
    setMiscError(null);
    setMiscVerification('');
    try {
      const res = await aiService.labAssistant({
        action: 'misconception-diagnose',
        subject: miscSubject,
        topic: miscQuestion,
        context: miscStudentIdea || 'Student held an inaccurate scientific intuition.',
        language,
      });
      setMiscDiagnosis(res);
    } catch (err: unknown) {
      setMiscError(err instanceof Error ? err.message : 'Unable to analyze misconception.');
    } finally {
      setMiscLoading(false);
    }
  };

  const handleVerifyMisconception = async () => {
    if (!miscFollowup.trim() || miscLoading) return;
    setMiscLoading(true);
    setMiscError(null);
    try {
      const res = await aiService.labAssistant({
        action: 'misconception-verify',
        subject: miscSubject,
        topic: miscQuestion,
        context: miscFollowup,
        language,
      });
      setMiscVerification(res);
    } catch (err: unknown) {
      setMiscError(err instanceof Error ? err.message : 'Unable to verify answer.');
    } finally {
      setMiscLoading(false);
    }
  };

  const handleLocalExplore = async () => {
    if (!localTopic.trim() || localLoading) return;
    setLocalLoading(true);
    try {
      const text = await aiService.labAssistant({
        action: 'local-explorer',
        subject: localSubject,
        topic: localTopic,
        context: 'Everyday safe observations and measurements.',
        language,
      });
      setLocalResult(text);
    } catch (err: unknown) {
      setLocalResult(err instanceof Error ? err.message : 'Unable to reach Local Science Explorer.');
    } finally {
      setLocalLoading(false);
    }
  };

  const claimQuestReward = async (questId: string, points: number) => {
    if (!user?.uid || claimedQuests.includes(questId)) return;
    const next = [...claimedQuests, questId];
    setClaimedQuests(next);
    try {
      localStorage.setItem(`claimed_quests_${user.uid}`, JSON.stringify(next));
      await dbService.updatePoints(user.uid, points);
      await refreshProfile();
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
            <Brain size={15} />
            <span>LearnLab AI Intelligence Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t('hubTitle')}</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Personalised Learning Twin, Exam Readiness Meter, Misconception Detector, Science Quest missions, Local Explorer, Multilingual Tutor, and Offline Study Packs.
          </p>
        </div>

        {/* Multilingual Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code as AppLanguage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                language === opt.code
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.nativeLabel}
            </button>
          ))}
        </div>
      </header>

      {/* A: AI Learning Twin Radar Visualization */}
      <AILearningTwin
        compact
        userId={user?.uid}
        savedQuizzes={savedQuizzes}
        labResults={labResults}
        progress={progress}
        loading={loadingData}
      />

      {/* A & J: Exam Readiness Meter & Adaptive Path */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Gauge size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t('learningTwin')} &amp; {t('examReadiness')}</h2>
                <p className="text-xs text-muted-foreground">
                  Computed from {savedQuizzes.length} saved quizzes, {labResults.length} virtual labs &amp; {progress.length} modules
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary">{twin.overallReadiness}%</span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Overall Readiness
              </p>
            </div>
          </div>

          {loadingData ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Synchronizing student knowledge map...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {twin.nodes.map((node) => (
                <div
                  key={node.subject}
                  className="p-4 rounded-2xl bg-muted/35 border border-border space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{node.label}</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        node.status === 'Strong'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : node.status === 'Developing'
                            ? 'bg-amber-500/15 text-amber-500'
                            : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${node.masteryScore}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Mastery: {node.masteryScore}% · Labs: {node.labsCompleted}</span>
                    <button
                      type="button"
                      onClick={() => navigate(node.recommendedLabRoute)}
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Lab</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Adaptive Path Recommendations */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <span>Adaptive Learning Path</span>
            </h3>
            <div className="space-y-3">
              {twin.adaptivePath.map((step) => (
                <button
                  key={step.step}
                  type="button"
                  onClick={() => navigate(step.route)}
                  className="w-full text-left p-3.5 rounded-2xl bg-muted/40 border border-border hover:border-primary/40 transition-all space-y-1 cursor-pointer"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Step {step.step}
                  </div>
                  <p className="text-xs font-bold">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground">{step.reason}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs">
            <span className="font-bold">Weakest Topic Focus: </span>
            <span>{twin.weakestSubject.label} — practice {twin.weakestSubject.recommendedLabName}.</span>
          </div>
        </div>
      </section>

      {/* B: AI Misconception Detector */}
      <section className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold">{t('misconceptionDetector')}</h2>
            <p className="text-xs text-muted-foreground">
              Diagnose scientific misunderstandings, understand why intuition failed, jump into a verifying virtual lab, and test mastery.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={miscSubject}
            onChange={(e) => setMiscSubject(e.target.value)}
            className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
            <option value="biology">Biology</option>
            <option value="computer">Computer Science</option>
            <option value="math">Mathematics</option>
            <option value="electrical">Electrical Eng.</option>
          </select>
          <input
            value={miscQuestion}
            onChange={(e) => setMiscQuestion(e.target.value)}
            placeholder="Concept or question you missed..."
            className="md:col-span-3 bg-muted border border-border rounded-xl px-3 py-2 text-xs"
          />
        </div>

        <textarea
          rows={2}
          value={miscStudentIdea}
          onChange={(e) => setMiscStudentIdea(e.target.value)}
          placeholder="What did you originally believe or choose?"
          className="w-full bg-muted border border-border rounded-2xl p-3 text-xs outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={miscLoading || !miscQuestion.trim()}
            onClick={handleDiagnoseMisconception}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {miscLoading ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
            <span>Analyze Misconception</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/subject/${miscSubject}?tab=tool`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-muted text-xs font-bold hover:border-primary cursor-pointer"
          >
            <span>Open {miscSubject.toUpperCase()} Lab to Test</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {miscError && <p className="text-xs font-bold text-red-500">{miscError}</p>}

        {miscDiagnosis && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{miscDiagnosis}</Markdown>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <p className="text-xs font-bold text-emerald-500">
                Verification Check — Explain the corrected principle in your own words:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={miscFollowup}
                  onChange={(e) => setMiscFollowup(e.target.value)}
                  placeholder="Write your corrected scientific explanation..."
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  disabled={miscLoading || !miscFollowup.trim()}
                  onClick={handleVerifyMisconception}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer"
                >
                  Verify Mastery
                </button>
              </div>
              {miscVerification && (
                <div className="pt-2 prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{miscVerification}</Markdown>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* M & L: AI Science Quest + Local Science Explorer */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Flame size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">{t('scienceQuest')}</h2>
                <p className="text-xs text-muted-foreground">Complete real lab &amp; quiz missions to earn XP</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-amber-500">
              <Trophy size={14} />
              <span>{profile?.points || 0} XP</span>
            </div>
          </div>

          <div className="space-y-3">
            {twin.missions.map((m) => {
              const claimed = claimedQuests.includes(m.id);
              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-muted/35 border border-border flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{m.title}</span>
                      <span className="text-[10px] font-black text-primary">+{m.rewardPoints} XP</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{m.description}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Progress: {m.currentCount} / {m.targetCount}
                    </p>
                  </div>

                  {m.completed ? (
                    <button
                      type="button"
                      disabled={claimed || !user?.uid}
                      onClick={() => claimQuestReward(m.id, m.rewardPoints)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {claimed ? 'Claimed ✓' : 'Claim XP'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate(m.actionRoute)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-background text-xs font-bold hover:border-primary shrink-0 cursor-pointer"
                    >
                      Start
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* L: AI Local Science Explorer */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-500 flex items-center justify-center">
              <Compass size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI Local Science Explorer</h2>
              <p className="text-xs text-muted-foreground">Connect concepts to everyday measurements &amp; safe observations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={localSubject}
              onChange={(e) => setLocalSubject(e.target.value)}
              className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold"
            >
              <option value="physics">Physics</option>
              <option value="chemistry">Chemistry</option>
              <option value="biology">Biology</option>
              <option value="electrical">Electrical</option>
            </select>
            <input
              value={localTopic}
              onChange={(e) => setLocalTopic(e.target.value)}
              placeholder="Topic or everyday observation..."
              className="sm:col-span-2 bg-muted border border-border rounded-xl px-3 py-2 text-xs"
            />
          </div>

          <button
            type="button"
            disabled={localLoading || !localTopic.trim()}
            onClick={handleLocalExplore}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
          >
            {localLoading ? <Loader2 size={14} className="animate-spin" /> : <Compass size={14} />}
            <span>Generate Safe Field Investigation</span>
          </button>

          {localResult && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none max-h-64 overflow-y-auto">
              <Markdown>{localResult}</Markdown>
            </div>
          )}
        </div>
      </section>

      {/* Sections 21 & 27: Personalised Study Planner & Guided Demo Tour */}
      <CompetitionDemoPanel userId={user?.uid} twin={twin} />

      {/* N: Offline & Low-Bandwidth Learning */}
      <section className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold">{t('offlineLearning')}</h2>
              <p className="text-xs text-muted-foreground">
                Cache subject formula &amp; lab study packs offline, queue lab results when disconnected, and reduce motion/bandwidth.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={lowBandwidth}
                onChange={(e) => {
                  setLowBandwidth(e.target.checked);
                  setLowBandwidthMode(e.target.checked);
                }}
              />
              <span>{t('lowBandwidth')}</span>
            </label>

            <button
              type="button"
              onClick={async () => {
                const res = await flushOfflineQueue();
                setSyncMessage(`Synced ${res.synced} queued item(s); ${res.remaining} remaining.`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>{t('syncNow')} ({offlineQueueCount})</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <p className="text-xs font-bold text-emerald-500">{syncMessage}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(BUILTIN_STUDY_PACKS).map(([key, pack]) => {
            const isCached = Boolean(savedPacks[key]);
            return (
              <div
                key={key}
                className="p-4 rounded-2xl bg-muted/35 border border-border flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold">{pack.title}</span>
                    {isCached && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{pack.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveStudyPackOffline(key);
                      setSavedPacks(getSavedStudyPacks());
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-background border border-border text-[11px] font-bold hover:border-primary cursor-pointer"
                  >
                    {isCached ? 'Cached Offline' : t('downloadPack')}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadStudyPackFile(key)}
                    className="py-1.5 px-2.5 rounded-xl bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 inline-flex items-center gap-1 cursor-pointer"
                    title="Download Markdown Study Pack"
                  >
                    <Download size={12} />
                    <span>.MD</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
