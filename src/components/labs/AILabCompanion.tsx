import React, { useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  FlaskConical,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  Play,
  Download,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { aiService } from '../../services/ai';
import { learningDataService } from '../../services/learningData';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { downloadSingleLabReportPdf } from '../../lib/pdfLabReport';
import type { LabResult, LabSubject } from '../../types';

type CompanionTab = 'plan' | 'what-if' | 'rescue' | 'report' | 'viva' | 'local';

interface TemplatePreset {
  id: string;
  label: string;
  subLab: string;
  topic: string;
}

const VALIDATED_TEMPLATES: Record<string, TemplatePreset[]> = {
  physics: [
    { id: 'what-if', label: 'What-If Force, Gravity & Drag', subLab: 'what-if', topic: 'Gravity, air resistance, friction, and terminal velocity' },
    { id: 'pendulum', label: 'Simple Pendulum & Gravity', subLab: 'mechanics', topic: 'Pendulum period, string length, and g' },
    { id: 'optics', label: 'Thin Lens Focal Bench', subLab: 'optics', topic: 'Convex lens image distance and magnification' },
    { id: 'waves', label: 'Harmonic Wave Interference', subLab: 'waves', topic: 'Frequency, wavelength, and standing wave nodes' },
    { id: 'solar', label: 'Keplerian Orbital Balance', subLab: 'solar', topic: 'Planetary orbital velocity and eccentricity' },
  ],
  chemistry: [
    { id: 'ph', label: 'Acid-Base Titration Curve', subLab: 'ph', topic: 'Strong/weak acid-base titration equivalence point' },
    { id: 'molecules', label: '3D VSEPR Molecular Shape', subLab: 'molecules', topic: 'Bond angles and lone-pair repulsion geometry' },
    { id: 'reactions', label: 'Reaction Enthalpy & Balancing', subLab: 'reactions', topic: 'Exothermic vs endothermic activation energy' },
  ],
  biology: [
    { id: 'body', label: 'Cardiopulmonary 3D System', subLab: 'body', topic: 'Cardiac cycle lub-dub and pulmonary gas exchange' },
    { id: 'cell', label: 'Organelle Structure 3D', subLab: 'cell', topic: 'Mitochondria, ER, and Golgi transport pathways' },
    { id: 'build-cell', label: 'Assemble Eukaryotic Cell', subLab: 'build-cell', topic: 'Organelle identification and cellular function' },
  ],
  computer: [
    { id: 'ide', label: 'Algorithm Trace & Sandboxed Code', subLab: 'ide', topic: 'Recursion, sorting, and DOM interactivity' },
    { id: 'network', label: 'TCP/IP Packet & Firewall Routing', subLab: 'network', topic: 'DNS lookup, handshake latency, and packet hops' },
  ],
  math: [
    { id: 'calculus', label: 'Derivatives & Tangent Slope', subLab: 'math', topic: 'Rate of change, extrema, and area under curve' },
  ],
  electrical: [
    { id: 'circuits', label: 'Ohm Law & RC Time Constant', subLab: 'electrical', topic: 'Series/parallel resistance and capacitor charging' },
  ],
};

function mapSubjectToLabSubject(subjectId: string): LabSubject {
  if (subjectId === 'computer') return 'computer';
  if (subjectId === 'math') return 'math';
  if (subjectId === 'electrical') return 'electrical';
  if (subjectId === 'physics' || subjectId === 'chemistry' || subjectId === 'biology') {
    return subjectId;
  }
  return 'physics';
}

export const AILabCompanion: React.FC<{
  subjectId: string;
  activeSubLab: string;
  onSelectSubLab?: (subLab: string) => void;
}> = ({ subjectId, activeSubLab, onSelectSubLab }) => {
  const { user, profile } = useAuth();
  const { language, languageMeta } = useLanguage();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CompanionTab>('plan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = VALIDATED_TEMPLATES[subjectId] || VALIDATED_TEMPLATES.physics;
  const [selectedPreset, setSelectedPreset] = useState<string>(presets[0]?.id || 'default');
  const [customTopic, setCustomTopic] = useState(presets[0]?.topic || '');
  const [planOutput, setPlanOutput] = useState('');

  // What-If Lab quantitative sliders (Physics/Chem/Bio numeric simulation + AI commentary)
  const [paramA, setParamA] = useState(50);
  const [paramB, setParamB] = useState(25);
  const [whatIfOutput, setWhatIfOutput] = useState('');

  // Lab Rescue
  const [rescueStepInput, setRescueStepInput] = useState('');
  const [rescueOutput, setRescueOutput] = useState('');

  // Practical Report Assistant
  const [savedLabs, setSavedLabs] = useState<LabResult[]>([]);
  const [reportDraft, setReportDraft] = useState('');

  // Viva Examiner
  const [vivaQuestion, setVivaQuestion] = useState('');
  const [vivaAnswer, setVivaAnswer] = useState('');
  const [vivaEvaluation, setVivaEvaluation] = useState('');
  const [listening, setListening] = useState(false);

  // Local Science Explorer
  const [localConcept, setLocalConcept] = useState(presets[0]?.topic || '');
  const [localOutput, setLocalOutput] = useState('');

  useEffect(() => {
    const nextPresets = VALIDATED_TEMPLATES[subjectId] || VALIDATED_TEMPLATES.physics;
    setSelectedPreset(nextPresets[0]?.id || 'default');
    setCustomTopic(nextPresets[0]?.topic || '');
    setLocalConcept(nextPresets[0]?.topic || '');
    setPlanOutput('');
    setWhatIfOutput('');
    setRescueOutput('');
    setVivaQuestion('');
    setVivaEvaluation('');
    setLocalOutput('');
  }, [subjectId]);

  useEffect(() => {
    if (!user?.uid || tab !== 'report') return;
    const labSubj = mapSubjectToLabSubject(subjectId);
    learningDataService
      .getLabResults(user.uid)
      .then((list) => {
        const filtered = list.filter((l) => l.subject === labSubj);
        setSavedLabs(filtered.length > 0 ? filtered.slice(0, 12) : list.slice(0, 6));
      })
      .catch(() => {});
  }, [user?.uid, subjectId, tab]);

  const whatIfSimulation = useMemo(() => {
    if (subjectId === 'chemistry') {
      const molarity = +(0.05 + (paramA / 100) * 0.95).toFixed(2);
      const addedBaseMl = Math.round((paramB / 100) * 50);
      const eqPoint = 25;
      const ratio = addedBaseMl / eqPoint;
      const pH =
        ratio < 0.98
          ? Math.max(0.8, +(1.3 + ratio * 3.1).toFixed(2))
          : ratio <= 1.04
            ? 7.0
            : Math.min(13.4, +(7.4 + (ratio - 1) * 5.2).toFixed(2));
      return {
        labelA: `Acid Concentration: ${molarity} M`,
        labelB: `Titrant Base Added: ${addedBaseMl} mL`,
        readout: `Simulated pH = ${pH} | Equivalence at ${eqPoint} mL`,
        formula: 'pH = -log10([H+]) | M1*V1 = M2*V2',
      };
    }
    if (subjectId === 'biology') {
      const heartRate = Math.round(55 + (paramA / 100) * 115); // 55-170 bpm
      const strokeVol = Math.round(55 + (paramB / 100) * 45); // 55-100 mL
      const coLiters = +((heartRate * strokeVol) / 1000).toFixed(2);
      return {
        labelA: `Heart Rate: ${heartRate} bpm`,
        labelB: `Stroke Volume: ${strokeVol} mL/beat`,
        readout: `Simulated Cardiac Output = ${coLiters} L/min`,
        formula: 'CO = HR * SV',
      };
    }
    // Physics / General quantitative pendulum + Ohm fallback
    const lengthM = +(0.2 + (paramA / 100) * 2.3).toFixed(2);
    const gravity = +(3.7 + (paramB / 100) * 16.3).toFixed(2); // Mars ~3.7 to Jupiter-like
    const period = +(2 * Math.PI * Math.sqrt(lengthM / gravity)).toFixed(3);
    return {
      labelA: `Pendulum Length (L): ${lengthM} m`,
      labelB: `Gravitational Field (g): ${gravity} m/s^2`,
      readout: `Oscillation Period T = ${period} s (f = ${(1 / period).toFixed(2)} Hz)`,
      formula: 'T = 2 * pi * sqrt(L / g)',
    };
  }, [subjectId, paramA, paramB]);

  const runAssistant = async (
    action: Parameters<typeof aiService.labAssistant>[0]['action'],
    topic: string,
    context: string,
    onSuccess: (text: string) => void
  ) => {
    setLoading(true);
    setError(null);
    try {
      const text = await aiService.labAssistant({
        action,
        subject: `${subjectId} (${activeSubLab})`,
        topic,
        context,
        language,
      });
      onSuccess(text);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI Lab Assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
    if (!SpeechRec) {
      setError('Speech recognition is not supported in this browser; please type your viva answer.');
      return;
    }
    const rec = new SpeechRec();
    rec.lang = language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-US';
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      setVivaAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ''));
    utter.lang = language === 'ur' ? 'ur-PK' : 'en-US';
    window.speechSynthesis.speak(utter);
  };

  const activePresetObj = presets.find((p) => p.id === selectedPreset) || presets[0];

  return (
    <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black tracking-tight">
              AI Virtual Lab Workbench
            </h3>
            <p className="text-xs text-muted-foreground">
              Experiment Generator · What-If Variables · Lab Rescue · Practical Report · Viva Examiner · Local Explorer ({languageMeta.nativeLabel})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-primary shrink-0">
          <span>{open ? 'Hide' : 'Open AI Tools'}</span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="p-6 pt-2 border-t border-border space-y-5">
          {/* Tool Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'plan', label: 'Experiment Plan', icon: FlaskConical },
                { id: 'what-if', label: 'What-If Lab', icon: Sliders },
                { id: 'rescue', label: 'Lab Rescue', icon: HelpCircle },
                { id: 'report', label: 'Practical Report', icon: FileText },
                { id: 'viva', label: 'Viva Examiner', icon: Mic },
                { id: 'local', label: 'Local Explorer', icon: Compass },
              ] as Array<{ id: CompanionTab; label: string; icon: React.ComponentType<{ size?: number }> }>
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setError(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tab === item.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-500">
              {error}
            </div>
          )}

          {/* D. AI Experiment Generator (Validated simulator templates only) */}
          {tab === 'plan' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    const p = presets.find((x) => x.id === e.target.value);
                    setSelectedPreset(e.target.value);
                    if (p) setCustomTopic(p.topic);
                  }}
                  className="bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      Template: {p.label}
                    </option>
                  ))}
                </select>
                <input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Experiment topic or learning goal..."
                  className="md:col-span-2 bg-muted border border-border rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    runAssistant(
                      'experiment-plan',
                      customTopic || activePresetObj?.label || 'Science Lab',
                      `Validated Simulator Template: ${activePresetObj?.label} (${activePresetObj?.subLab})`,
                      setPlanOutput
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Generate Experiment Plan</span>
                </button>
                {onSelectSubLab && activePresetObj?.subLab && activePresetObj.subLab !== subjectId && (
                  <button
                    type="button"
                    onClick={() => onSelectSubLab(activePresetObj.subLab)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 cursor-pointer"
                  >
                    <Play size={13} />
                    <span>Launch {activePresetObj.label}</span>
                  </button>
                )}
              </div>
              {planOutput && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{planOutput}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* E. AI What-If Laboratory */}
          {tab === 'what-if' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{whatIfSimulation.labelA}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={paramA}
                    onChange={(e) => setParamA(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{whatIfSimulation.labelB}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={paramB}
                    onChange={(e) => setParamB(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-primary uppercase tracking-wider">
                    Live Quantitative Readout ({whatIfSimulation.formula})
                  </p>
                  <p className="text-sm font-bold mt-1">{whatIfSimulation.readout}</p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    runAssistant(
                      'what-if',
                      `${whatIfSimulation.labelA}, ${whatIfSimulation.labelB}`,
                      `Computed simulation output: ${whatIfSimulation.readout} using ${whatIfSimulation.formula}`,
                      setWhatIfOutput
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 cursor-pointer"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Explain Variable Impact</span>
                </button>
              </div>
              {whatIfOutput && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{whatIfOutput}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* F. AI Lab Rescue */}
          {tab === 'rescue' && (
            <div className="space-y-3">
              <textarea
                rows={3}
                value={rescueStepInput}
                onChange={(e) => setRescueStepInput(e.target.value)}
                placeholder="Describe what went wrong, unexpected measurement, or calculation you are stuck on..."
                className="w-full bg-muted border border-border rounded-2xl p-3 text-xs outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                disabled={loading || !rescueStepInput.trim()}
                onClick={() =>
                  runAssistant(
                    'lab-rescue',
                    `Lab rescue for ${activeSubLab}`,
                    rescueStepInput,
                    setRescueOutput
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
                <span>Get Socratic Hint (No Spoiler)</span>
              </button>
              {rescueOutput && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{rescueOutput}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* G. AI Practical Report Assistant */}
          {tab === 'report' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Found {savedLabs.length} saved lab record(s) for practical synthesis.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      const summaryCtx =
                        savedLabs.length > 0
                          ? savedLabs
                              .slice(0, 3)
                              .map(
                                (r) =>
                                  `Title: ${r.experimentTitle}\nOutcome: ${r.outcome}\nMeasurements: ${r.measurements || 'N/A'}\nNotes: ${r.notes || ''}`
                              )
                              .join('\n---\n')
                          : `Active Simulation Context: ${whatIfSimulation.readout}`;
                      runAssistant(
                        'practical-report',
                        savedLabs[0]?.experimentTitle || `${subjectId} Practical Report`,
                        summaryCtx,
                        setReportDraft
                      );
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    <span>Draft Report From Observations</span>
                  </button>
                  {reportDraft && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadSingleLabReportPdf(
                          {
                            experimentTitle: savedLabs[0]?.experimentTitle || `${subjectId.toUpperCase()} Practical Report`,
                            subject: mapSubjectToLabSubject(subjectId),
                            outcome: reportDraft.slice(0, 600),
                            measurements: savedLabs[0]?.measurements || whatIfSimulation.readout,
                            notes: reportDraft,
                            createdAt: new Date(),
                          },
                          {
                            studentName: profile?.displayName || undefined,
                            studentEmail: user?.email || undefined,
                          }
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-muted text-xs font-bold hover:border-primary cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Export PDF</span>
                    </button>
                  )}
                </div>
              </div>
              <textarea
                rows={7}
                value={reportDraft}
                onChange={(e) => setReportDraft(e.target.value)}
                placeholder="Your AI-generated practical report will appear here and can be edited freely before exporting PDF..."
                className="w-full bg-muted border border-border rounded-2xl p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* H. AI Viva Examiner */}
          {tab === 'viva' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    runAssistant(
                      'viva-question',
                      customTopic || activeSubLab,
                      `Subject: ${subjectId}, Lab Module: ${activeSubLab}`,
                      (q) => {
                        setVivaQuestion(q);
                        setVivaEvaluation('');
                      }
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Ask Viva Question</span>
                </button>
                {vivaQuestion && (
                  <button
                    type="button"
                    onClick={() => speakText(vivaQuestion)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-muted text-xs font-bold cursor-pointer"
                  >
                    <Volume2 size={13} />
                    <span>Read Aloud</span>
                  </button>
                )}
              </div>

              {vivaQuestion && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown>{vivaQuestion}</Markdown>
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={vivaAnswer}
                      onChange={(e) => setVivaAnswer(e.target.value)}
                      placeholder="Type or dictate your practical viva answer..."
                      className="flex-1 bg-background border border-border rounded-xl p-2.5 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`px-3 rounded-xl border border-border flex items-center justify-center cursor-pointer ${
                        listening ? 'bg-red-500 text-white' : 'bg-background hover:bg-muted'
                      }`}
                      title="Voice Viva Input"
                    >
                      {listening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={loading || !vivaAnswer.trim()}
                    onClick={() =>
                      runAssistant(
                        'viva-evaluate',
                        vivaQuestion,
                        vivaAnswer,
                        setVivaEvaluation
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer"
                  >
                    <span>Evaluate Viva Answer</span>
                  </button>
                </div>
              )}

              {vivaEvaluation && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{vivaEvaluation}</Markdown>
                </div>
              )}
            </div>
          )}

          {/* L. AI Local Science Explorer */}
          {tab === 'local' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={localConcept}
                  onChange={(e) => setLocalConcept(e.target.value)}
                  placeholder="Enter any concept (e.g. refraction, vinegar pH, pulse rate, household circuit)..."
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  disabled={loading || !localConcept.trim()}
                  onClick={() =>
                    runAssistant(
                      'local-explorer',
                      localConcept,
                      `Connect to safe everyday observations for ${subjectId}.`,
                      setLocalOutput
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0 cursor-pointer"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Compass size={14} />}
                  <span>Explore Real-World Lab</span>
                </button>
              </div>
              {localOutput && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{localOutput}</Markdown>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
