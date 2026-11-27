import React, { useEffect, useRef, useState } from 'react';
import { FileDown, Pause, Play, RotateCcw, Save, Zap } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

interface ChemicalReactionSpec {
  id: string;
  name: string;
  category: 'Synthesis' | 'Neutralization' | 'Combustion' | 'Displacement' | 'Decomposition';
  equation: string;
  deltaH: number; // kJ/mol negative = exothermic, positive = endothermic
  activationEa: number; // kJ/mol
  reactants: { label: string; color: string; count: number }[];
  products: { label: string; color: string; count: number }[];
  observation: string;
}

const REACTIONS: ChemicalReactionSpec[] = [
  {
    id: 'water_synth',
    name: 'Hydrogen Combustion',
    category: 'Synthesis',
    equation: '2 H₂(g) + O₂(g) → 2 H₂O(g)',
    deltaH: -572,
    activationEa: 240,
    reactants: [
      { label: 'H₂', color: '#e2e8f0', count: 2 },
      { label: 'O₂', color: '#ef4444', count: 1 },
    ],
    products: [{ label: 'H₂O', color: '#38bdf8', count: 2 }],
    observation: 'Bright thermal flame forms polarized liquid/vapor water molecules.',
  },
  {
    id: 'neutralization',
    name: 'Acid-Base Neutralization',
    category: 'Neutralization',
    equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
    deltaH: -57.3,
    activationEa: 25,
    reactants: [
      { label: 'HCl', color: '#f97316', count: 1 },
      { label: 'NaOH', color: '#a855f7', count: 1 },
    ],
    products: [
      { label: 'NaCl', color: '#10b981', count: 1 },
      { label: 'H₂O', color: '#38bdf8', count: 1 },
    ],
    observation: 'Proton transfer from H₃O⁺ to OH⁻ neutralizes solution to pH 7.0.',
  },
  {
    id: 'methane_comb',
    name: 'Methane Combustion',
    category: 'Combustion',
    equation: 'CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(g)',
    deltaH: -890,
    activationEa: 150,
    reactants: [
      { label: 'CH₄', color: '#64748b', count: 1 },
      { label: 'O₂', color: '#ef4444', count: 2 },
    ],
    products: [
      { label: 'CO₂', color: '#94a3b8', count: 1 },
      { label: 'H₂O', color: '#38bdf8', count: 2 },
    ],
    observation: 'Clean blue Bunsen flame releasing high enthalpy upon C=O bond formation.',
  },
  {
    id: 'zn_cuso4',
    name: 'Zinc-Copper Displacement',
    category: 'Displacement',
    equation: 'Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)',
    deltaH: -217,
    activationEa: 65,
    reactants: [
      { label: 'Zn', color: '#94a3b8', count: 1 },
      { label: 'CuSO₄', color: '#2563eb', count: 1 },
    ],
    products: [
      { label: 'ZnSO₄', color: '#cbd5e1', count: 1 },
      { label: 'Cu', color: '#d97706', count: 1 },
    ],
    observation: 'Blue Cu²⁺ fades to clear Zn²⁺ as metallic copper plates onto Zinc.',
  },
  {
    id: 'caco3_decomp',
    name: 'Limestone Thermal Decomposition',
    category: 'Decomposition',
    equation: 'CaCO₃(s) + Heat → CaO(s) + CO₂(g)',
    deltaH: 178,
    activationEa: 260,
    reactants: [{ label: 'CaCO₃', color: '#cbd5e1', count: 1 }],
    products: [
      { label: 'CaO', color: '#f1f5f9', count: 1 },
      { label: 'CO₂', color: '#94a3b8', count: 1 },
    ],
    observation: 'Endothermic calcination absorbs thermal energy to evolve CO₂ gas.',
  },
];

export default function ReactionsLab() {
  const [rxnId, setRxnId] = useState<string>('water_synth');
  const [progress, setProgress] = useState<number>(0); // 0 to 100
  const [playing, setPlaying] = useState<boolean>(false);
  const [temperatureK, setTemperatureK] = useState<number>(350);
  const [catalyst, setCatalyst] = useState<boolean>(false);

  const chamberCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    saveResult,
    downloadPdfReport,
    recordStep,
    recordedSteps,
    saving,
    feedback,
    canSave,
  } = useSaveLabResult('chemistry');

  const rxn = REACTIONS.find((r) => r.id === rxnId) ?? REACTIONS[0];
  const effectiveEa = catalyst ? Math.round(rxn.activationEa * 0.55) : rxn.activationEa;
  const isEndothermic = rxn.deltaH > 0;
  const rateFactor = ((temperatureK / 300) * (catalyst ? 1.85 : 1.0)).toFixed(2);

  useEffect(() => {
    recordStep(`Selected ${rxn.name} (${rxn.equation}) at ${temperatureK} K.`);
  }, [rxn.id, rxn.name, rxn.equation, recordStep]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        const step = 1.6 * Number(rateFactor);
        if (prev + step >= 100) {
          setPlaying(false);
          recordStep(`Completed reaction coordinate (100%) — ΔH = ${rxn.deltaH} kJ/mol.`);
          return 100;
        }
        return prev + step;
      });
    }, 40);
    return () => window.clearInterval(interval);
  }, [playing, rateFactor, rxn.deltaH, recordStep]);

  // 60fps Canvas2D Molecular Collision & Transition-State Simulation
  useEffect(() => {
    const canvas = chamberCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let time = 0;
    const draw = () => {
      time += 0.045 * Number(rateFactor);
      const w = canvas.width;
      const h = canvas.height;
      const tNorm = progress / 100;

      ctx.clearRect(0, 0, w, h);

      // Chamber background gradient shifts subtle thermal glow
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#020617');
      bg.addColorStop(1, '#0f172a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Catalytic Pt/Pd grid floor when catalyst is ON
      if (catalyst) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, h - 18);
        ctx.lineTo(w - 20, h - 18);
        ctx.stroke();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('CATALYTIC SURFACE (-45% Ea)', 24, h - 24);
      }

      // Transition state halo pulse near t = 0.5
      const tsProximity = Math.max(0, 1 - Math.abs(tNorm - 0.5) / 0.24);
      if (tsProximity > 0.02) {
        const cx = w / 2;
        const cy = h / 2;
        const r = 34 + tsProximity * 52 + Math.sin(time * 2.4) * 5;
        const rad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
        rad.addColorStop(0, isEndothermic ? `rgba(56,189,248,${0.6 * tsProximity})` : `rgba(249,115,22,${0.65 * tsProximity})`);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw approaching reactants -> transition complex -> rebounding products
      const items = tNorm < 0.5 ? rxn.reactants : rxn.products;
      const spread =
        tNorm < 0.5
          ? (1 - tNorm * 2) * (w * 0.28)
          : ((tNorm - 0.5) * 2) * (w * 0.26);

      items.forEach((species, idx) => {
        const count = Math.min(species.count, 3);
        for (let c = 0; c < count; c++) {
          const dirSign = (idx + c) % 2 === 0 ? -1 : 1;
          const jitterX = Math.sin(time * 2.1 + idx * 1.9 + c) * (3 + temperatureK / 160);
          const jitterY = Math.cos(time * 2.4 + idx * 1.3 + c * 2) * (6 + temperatureK / 140);
          const px = w / 2 + dirSign * (24 + spread) + jitterX;
          const py = h / 2 + ((idx - (items.length - 1) / 2) * 32) + ((c - (count - 1) / 2) * 18) + jitterY;

          // Electron shell / thermal halo
          ctx.fillStyle = species.color + '44';
          ctx.beginPath();
          ctx.arc(px, py, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = species.color;
          ctx.beginPath();
          ctx.arc(px, py, 13, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffffaa';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(species.label, px, py);
        }
      });

      // Stage watermark
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
      ctx.font = '11px monospace';
      ctx.fillText(
        tNorm < 0.32 ? 'Phase: Molecular Approach' : tNorm < 0.68 ? 'Phase: Activated Complex [‡]' : 'Phase: Products Separated',
        14,
        18
      );

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [rxn, progress, temperatureK, catalyst, rateFactor, isEndothermic]);

  const stageLabel =
    progress < 32
      ? 'Reactants Approaching'
      : progress < 68
        ? 'Activated Complex (Transition State)'
        : 'Products Formed';

  // Energy profile coordinates (SVG viewBox 0..320 x 0..150)
  const startY = isEndothermic ? 110 : 62;
  const endY = isEndothermic ? 56 : 118;
  const peakY = Math.max(18, Math.min(startY, endY) - effectiveEa * 0.22);
  const dotX = 24 + (progress / 100) * 272;
  const t = progress / 100;
  const dotY =
    t < 0.5
      ? startY + (peakY - startY) * Math.sin((t * 2 * Math.PI) / 2)
      : peakY + (endY - peakY) * (1 - Math.cos(((t - 0.5) * 2 * Math.PI) / 2));

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Chemical Reactions &amp; Enthalpy Kinetics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step through bond rearrangement, transition states, catalysts, and exothermic vs endothermic energy curves.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (progress >= 99) setProgress(0);
              setPlaying((p) => !p);
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            <span>{playing ? 'Pause' : progress >= 99 ? 'Replay' : 'Run Reaction'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setProgress(0);
            }}
            className="px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Reaction List & Controls */}
        <div className="xl:col-span-4 space-y-4">
          <div className="space-y-1.5">
            {REACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRxnId(item.id);
                  setPlaying(false);
                  setProgress(0);
                }}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-colors',
                  rxnId === item.id
                    ? 'bg-primary/10 border-primary text-foreground'
                    : 'bg-muted/20 border-border hover:border-primary/40 text-foreground'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{item.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{item.category}</span>
                </div>
                <p className="text-xs font-mono text-primary mt-1">{item.equation}</p>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Temperature</span>
                <span className="font-mono font-semibold tabular-nums">{temperatureK} K</span>
              </div>
              <input
                type="range"
                min={250}
                max={900}
                step={10}
                value={temperatureK}
                onChange={(e) => setTemperatureK(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            <button
              type="button"
              onClick={() => setCatalyst((c) => !c)}
              className={cn(
                'w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors',
                catalyst
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-card border-border text-foreground hover:bg-muted/50'
              )}
            >
              <span className="flex items-center gap-2">
                <Zap size={14} />
                Catalyst Active
              </span>
              <span className="font-mono">{catalyst ? 'ON (-45% Ea)' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Visual Reaction Stage + Enthalpy Coordinate Graph */}
        <div className="xl:col-span-8 space-y-4">
          {/* Molecular Rearrangement Chamber */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-border text-slate-100 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono text-sky-400 uppercase tracking-wider">
                {stageLabel} ({Math.round(progress)}%)
              </span>
              <span className="text-xs font-mono text-slate-400">
                Relative Rate: {rateFactor}×
              </span>
            </div>

            <div className="h-44 rounded-xl bg-slate-900/80 border border-white/10 relative overflow-hidden">
              <canvas
                ref={chamberCanvasRef}
                width={560}
                height={176}
                className="w-full h-full block"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Reaction Coordinate Scrubber</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => {
                  setPlaying(false);
                  setProgress(Number(e.target.value));
                }}
                className="w-full accent-sky-400"
              />
            </div>
          </div>

          {/* Enthalpy Diagram & Observation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-foreground">
                  Reaction Energy Diagram
                </h3>
                <span
                  className={cn(
                    'text-xs font-mono font-bold',
                    isEndothermic ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  ΔH = {rxn.deltaH > 0 ? `+${rxn.deltaH}` : rxn.deltaH} kJ/mol
                </span>
              </div>
              <svg viewBox="0 0 320 140" className="w-full h-36">
                <line x1="20" y1="125" x2="305" y2="125" stroke="currentColor" strokeOpacity="0.2" />
                <line x1="20" y1="15" x2="20" y2="125" stroke="currentColor" strokeOpacity="0.2" />
                <path
                  d={`M 24 ${startY} C 100 ${startY}, 115 ${peakY}, 160 ${peakY} C 205 ${peakY}, 220 ${endY}, 296 ${endY}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />
                <circle cx={dotX} cy={dotY} r="5.5" fill="#f59e0b" />
                <text x="28" y={startY - 6} fontSize="9" fill="currentColor" opacity="0.7">
                  Reactants
                </text>
                <text x="240" y={endY - 6} fontSize="9" fill="currentColor" opacity="0.7">
                  Products
                </text>
                <text x="160" y={peakY - 6} textAnchor="middle" fontSize="9" fill="#f59e0b">
                  Ea = {effectiveEa} kJ
                </text>
              </svg>
            </div>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  {isEndothermic ? 'Endothermic Process' : 'Exothermic Process'}
                </p>
                <p className="text-xs font-mono text-primary">{rxn.equation}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{rxn.observation}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canSave && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveResult({
                        experimentTitle: rxn.name,
                        outcome: rxn.observation,
                        formula: rxn.equation,
                        measurements: `ΔH = ${rxn.deltaH} kJ/mol | Ea = ${effectiveEa} kJ/mol | T = ${temperatureK} K`,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Save size={14} />
                    <span>{saving ? 'Saving...' : 'Save Lab'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    let snapshotDataUrl: string | undefined;
                    try {
                      snapshotDataUrl = chamberCanvasRef.current?.toDataURL('image/png');
                    } catch {
                      snapshotDataUrl = undefined;
                    }
                    downloadPdfReport({
                      experimentTitle: rxn.name,
                      outcome: `${isEndothermic ? 'Endothermic' : 'Exothermic'} reaction verified: ${rxn.observation}`,
                      formula: rxn.equation,
                      measurements: `ΔH = ${rxn.deltaH} kJ/mol | Effective Ea = ${effectiveEa} kJ/mol | Temp = ${temperatureK} K | Catalyst = ${catalyst ? 'Active' : 'None'} | Rate = ${rateFactor}x`,
                      stepsTaken:
                        recordedSteps.length > 0
                          ? recordedSteps
                          : [
                              `Loaded ${rxn.name} (${rxn.equation}).`,
                              `Set temperature to ${temperatureK} K (${catalyst ? 'with catalyst' : 'uncatalyzed'}).`,
                              `Observed transition state barrier Ea = ${effectiveEa} kJ/mol and enthalpy change ΔH = ${rxn.deltaH} kJ/mol.`,
                            ],
                      snapshotDataUrl,
                    });
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-500 whitespace-nowrap"
                >
                  <FileDown size={14} />
                  <span>PDF Report</span>
                </button>
              </div>
              {feedback && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
