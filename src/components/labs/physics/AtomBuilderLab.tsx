import React, { useMemo, useState } from 'react';
import { FileDown, Minus, Plus, RotateCcw, Save } from 'lucide-react';
import { elements } from '../../../lib/elementData';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

function getShellDistribution(electrons: number): number[] {
  const caps = [2, 8, 18, 32, 32, 18, 8];
  const shells: number[] = [];
  let rem = electrons;
  for (const c of caps) {
    if (rem <= 0) break;
    const take = Math.min(rem, c);
    shells.push(take);
    rem -= take;
  }
  return shells;
}

export default function AtomBuilderLab() {
  const [protons, setProtons] = useState<number>(6); // Carbon default
  const [neutrons, setNeutrons] = useState<number>(6);
  const [electrons, setElectrons] = useState<number>(6);

  const { saveResult, downloadPdfReport, saving, feedback, canSave } = useSaveLabResult('physics');

  const element = useMemo(
    () => elements.find((e) => e.number === protons) ?? elements[0],
    [protons]
  );

  const massNumber = protons + neutrons;
  const netCharge = protons - electrons;
  const shells = useMemo(() => getShellDistribution(electrons), [electrons]);

  const stabilityLabel = useMemo(() => {
    if (protons === 1) return neutrons <= 1 ? 'Stable Isotope' : 'Radioactive (Tritium)';
    const idealN = Math.round(protons * (protons <= 20 ? 1.0 : 1.32));
    return Math.abs(neutrons - idealN) <= Math.max(1, Math.round(protons * 0.14))
      ? 'Stable Nucleus'
      : 'Unstable / Radioactive Isotope';
  }, [protons, neutrons]);

  const selectPresetElement = (z: number) => {
    const found = elements.find((e) => e.number === z);
    if (!found) return;
    setProtons(found.number);
    setNeutrons(Math.max(0, Math.round(found.atomic_mass) - found.number));
    setElectrons(found.number);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Interactive Atom &amp; Bohr Shell Builder (Z = 1–118)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assemble protons, neutrons, and orbital electrons to explore isotopes, net ionic charge, and electron shells.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={protons}
            onChange={(e) => selectPresetElement(Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-medium max-w-[220px]"
          >
            {elements.map((el) => (
              <option key={el.number} value={el.number}>
                {el.number}. {el.name} ({el.symbol})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => selectPresetElement(6)}
            className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Bohr Model Visualization */}
        <div className="xl:col-span-7 rounded-2xl bg-slate-950 border border-border p-4 flex flex-col items-center justify-center relative min-h-[380px]">
          <svg viewBox="0 0 360 360" className="w-full max-w-[360px] h-[340px]">
            {/* Concentric Orbiting Electron Shells */}
            {shells.map((count, sIdx) => {
              const r = 44 + sIdx * 24;
              return (
                <g key={sIdx}>
                  <circle
                    cx="180"
                    cy="180"
                    r={r}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <g>
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`${sIdx % 2 === 0 ? 0 : 360} 180 180`}
                      to={`${sIdx % 2 === 0 ? 360 : 0} 180 180`}
                      dur={`${6 + sIdx * 2.5}s`}
                      repeatCount="indefinite"
                    />
                    {Array.from({ length: count }, (_, eIdx) => {
                      const angle = (eIdx / count) * Math.PI * 2 - Math.PI / 2;
                      const ex = 180 + Math.cos(angle) * r;
                      const ey = 180 + Math.sin(angle) * r;
                      return <circle key={eIdx} cx={ex} cy={ey} r="4.2" fill="#38bdf8" />;
                    })}
                  </g>
                </g>
              );
            })}

            {/* Nucleus Cluster */}
            <g>
              {Array.from({ length: Math.min(protons + neutrons, 42) }, (_, idx) => {
                const isProton = idx % 2 === 0 && idx / 2 < protons;
                const spiralR = Math.sqrt(idx) * 3.1;
                const a = idx * 2.399;
                return (
                  <circle
                    key={idx}
                    cx={180 + Math.cos(a) * spiralR}
                    cy={180 + Math.sin(a) * spiralR}
                    r="4.5"
                    fill={isProton ? '#ef4444' : '#94a3b8'}
                  />
                );
              })}
            </g>
          </svg>

          <div className="flex items-center gap-4 text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Proton ({protons})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Neutron ({neutrons})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Electron ({electrons})
            </span>
          </div>
        </div>

        {/* Subatomic Controls & Spectral Telemetry */}
        <div className="xl:col-span-5 flex flex-col justify-between gap-4">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-muted-foreground">
                  Mass {massNumber} · Atomic #{protons}
                </p>
                <h3 className="text-2xl font-bold text-foreground">
                  {element.name} ({element.symbol}
                  {netCharge !== 0 ? (
                    <sup className="text-sm text-primary ml-0.5">
                      {Math.abs(netCharge) > 1 ? Math.abs(netCharge) : ''}
                      {netCharge > 0 ? '+' : '−'}
                    </sup>
                  ) : null}
                  )
                </h3>
              </div>
              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold',
                  stabilityLabel.startsWith('Stable')
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                )}
              >
                {stabilityLabel}
              </span>
            </div>

            {/* Stepper Controls */}
            {[
              { label: 'Protons (p⁺)', value: protons, min: 1, max: 118, setter: setProtons, color: 'text-rose-500' },
              { label: 'Neutrons (n⁰)', value: neutrons, min: 0, max: 180, setter: setNeutrons, color: 'text-slate-400' },
              { label: 'Electrons (e⁻)', value: electrons, min: 0, max: 118, setter: setElectrons, color: 'text-sky-500' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                <span className={cn('text-xs font-semibold', row.color)}>{row.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => row.setter(Math.max(row.min, row.value - 1))}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80"
                    aria-label={`Decrease ${row.label}`}
                  >
                    <Minus size={13} />
                  </button>
                  <span className="font-mono text-sm font-bold w-9 text-center tabular-nums">
                    {row.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => row.setter(Math.min(row.max, row.value + 1))}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80"
                    aria-label={`Increase ${row.label}`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <p className="text-[11px] text-muted-foreground">Shell Distribution</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">
                  {shells.join(' – ') || '0'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <p className="text-[11px] text-muted-foreground">Net Charge</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">
                  {netCharge === 0 ? 'Neutral (0)' : netCharge > 0 ? `+${netCharge} Cation` : `${netCharge} Anion`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveResult({
                    experimentTitle: `Atom Model: ${element.name}-${massNumber}`,
                    outcome: `${element.symbol} (${protons}p, ${neutrons}n, ${electrons}e) · ${stabilityLabel}`,
                    formula: `Z = ${protons}, A = ${massNumber}, Shells: ${shells.join('-')}`,
                    measurements: `Charge: ${netCharge >= 0 ? '+' : ''}${netCharge}`,
                  })
                }
                className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 whitespace-nowrap"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Lab'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                downloadPdfReport({
                  experimentTitle: `Atom Model: ${element.name}-${massNumber}`,
                  outcome: `Assembled ${element.name} (${element.symbol}) isotope mass ${massNumber} with ${protons}p⁺, ${neutrons}n⁰, ${electrons}e⁻ (${stabilityLabel}).`,
                  formula: `Z = ${protons}, A = ${massNumber}, Electron Config Shells: ${shells.join('–') || '0'}`,
                  measurements: `Net Charge: ${netCharge === 0 ? 'Neutral (0)' : netCharge > 0 ? `+${netCharge} Cation` : `${netCharge} Anion`} | Stability: ${stabilityLabel}`,
                  stepsTaken: [
                    `Set atomic number Z = ${protons} (${element.name}).`,
                    `Adjusted neutron count to ${neutrons} (mass number A = ${massNumber}) and inspected nuclear stability.`,
                    `Configured ${electrons} orbital electrons across ${shells.length} Bohr shells (${shells.join('–') || '0'}).`,
                  ],
                })
              }
              className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-500 whitespace-nowrap"
            >
              <FileDown size={14} />
              <span>PDF Report</span>
            </button>
          </div>
          {feedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>}
        </div>
      </div>
    </div>
  );
}
