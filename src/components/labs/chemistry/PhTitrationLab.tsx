import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Droplet, FlaskConical, RotateCcw, Save } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type IndicatorType = 'universal' | 'phenolphthalein' | 'methyl_orange' | 'bromothymol';

interface SampleSolution {
  name: string;
  basePh: number;
  note: string;
}

const SAMPLES: SampleSolution[] = [
  { name: '0.1 M HCl (Stomach Acid)', basePh: 1.0, note: 'Strong monoprotic mineral acid, 100% ionized' },
  { name: 'Lemon Juice', basePh: 2.2, note: 'Citric acid rich natural solution' },
  { name: 'Vinegar (Acetic Acid)', basePh: 2.9, note: 'Weak carboxylic acid CH₃COOH' },
  { name: 'Black Coffee', basePh: 5.0, note: 'Mildly acidic aqueous extract' },
  { name: 'Pure Water (25°C)', basePh: 7.0, note: 'Neutral auto-ionization [H⁺] = [OH⁻] = 10⁻⁷ M' },
  { name: 'Human Blood Buffer', basePh: 7.4, note: 'Bicarbonate buffered physiological fluid' },
  { name: 'Baking Soda (NaHCO₃)', basePh: 8.4, note: 'Mild alkaline hydrogen carbonate salt' },
  { name: 'Household Ammonia', basePh: 11.4, note: 'Weak base NH₃ forming OH⁻ ions' },
  { name: 'Sodium Hydroxide (0.1 M)', basePh: 13.0, note: 'Strong alkali fully dissociated into Na⁺ and OH⁻' },
];

function getIndicatorColor(ph: number, indicator: IndicatorType): string {
  if (indicator === 'phenolphthalein') {
    if (ph < 8.2) return '#e2e8f0';
    if (ph < 9.5) return '#f9a8d4';
    return '#db2777';
  }
  if (indicator === 'methyl_orange') {
    if (ph < 3.1) return '#ef4444';
    if (ph < 4.4) return '#f97316';
    return '#facc15';
  }
  if (indicator === 'bromothymol') {
    if (ph < 6.0) return '#eab308';
    if (ph < 7.6) return '#22c55e';
    return '#2563eb';
  }
  // Universal indicator spectrum
  if (ph < 2) return '#dc2626';
  if (ph < 4) return '#f97316';
  if (ph < 6) return '#facc15';
  if (ph < 7.5) return '#22c55e';
  if (ph < 9.5) return '#06b6d4';
  if (ph < 11.5) return '#3b82f6';
  return '#7c3aed';
}

function computeTitrationPh(analyteType: 'strong' | 'weak', volumeBaseMl: number): number {
  const va = 25; // 25.0 mL of 0.10 M acid
  const ca = 0.1;
  const cb = 0.1;
  const totalV = va + volumeBaseMl;
  const molesAcid = va * ca;
  const molesBase = volumeBaseMl * cb;

  if (analyteType === 'strong') {
    if (Math.abs(molesAcid - molesBase) < 1e-6) return 7.0;
    if (molesAcid > molesBase) {
      const h = (molesAcid - molesBase) / totalV;
      return Math.max(0.5, -Math.log10(h));
    }
    const oh = (molesBase - molesAcid) / totalV;
    return Math.min(13.5, 14 + Math.log10(oh));
  } else {
    // Weak acid (acetic acid, pKa = 4.76)
    const pKa = 4.76;
    const ka = Math.pow(10, -pKa);
    if (volumeBaseMl <= 0.01) {
      const h = Math.sqrt(ka * ca);
      return -Math.log10(h);
    }
    if (molesBase < molesAcid - 0.02) {
      return pKa + Math.log10(molesBase / (molesAcid - molesBase));
    }
    if (Math.abs(molesBase - molesAcid) <= 0.02) {
      const concSalt = molesAcid / totalV;
      const kb = 1e-14 / ka;
      const oh = Math.sqrt(kb * concSalt);
      return 14 + Math.log10(oh);
    }
    const oh = (molesBase - molesAcid) / totalV;
    return Math.min(13.5, 14 + Math.log10(oh));
  }
}

export default function PhTitrationLab() {
  const [mode, setMode] = useState<'scale' | 'titration'>('titration');
  const [selectedSample, setSelectedSample] = useState<string>(SAMPLES[2].name);
  const [waterDilutionMl, setWaterDilutionMl] = useState<number>(0);
  const [indicator, setIndicator] = useState<IndicatorType>('universal');

  // Titration state: 25 mL of 0.1 M acid titrated with 0.1 M NaOH
  const [analyte, setAnalyte] = useState<'strong' | 'weak'>('strong');
  const [naohAdded, setNaohAdded] = useState<number>(0);

  const { saveResult, saving, feedback, canSave } = useSaveLabResult('chemistry');

  const sampleObj = SAMPLES.find((s) => s.name === selectedSample) ?? SAMPLES[0];

  const effectiveSamplePh = useMemo(() => {
    const dilFactor = 100 / (100 + waterDilutionMl);
    if (sampleObj.basePh < 7) {
      const h = Math.pow(10, -sampleObj.basePh) * dilFactor + 1e-7;
      return Math.min(7, Number((-Math.log10(h)).toFixed(2)));
    }
    if (sampleObj.basePh > 7) {
      const oh = Math.pow(10, -(14 - sampleObj.basePh)) * dilFactor + 1e-7;
      return Math.max(7, Number((14 + Math.log10(oh)).toFixed(2)));
    }
    return 7.0;
  }, [sampleObj, waterDilutionMl]);

  const currentTitrationPh = useMemo(
    () => Number(computeTitrationPh(analyte, naohAdded).toFixed(2)),
    [analyte, naohAdded]
  );

  const activePh = mode === 'scale' ? effectiveSamplePh : currentTitrationPh;
  const liquidColor = getIndicatorColor(activePh, indicator);
  const hConc = Math.pow(10, -activePh).toExponential(2);
  const ohConc = Math.pow(10, -(14 - activePh)).toExponential(2);

  const titrationCurve = useMemo(() => {
    const pts: { ml: number; ph: number }[] = [];
    for (let v = 0; v <= 50; v += 1) {
      if (v <= naohAdded + 0.01) {
        pts.push({ ml: v, ph: Number(computeTitrationPh(analyte, v).toFixed(2)) });
      }
    }
    if (naohAdded > Math.floor(naohAdded)) {
      pts.push({ ml: Number(naohAdded.toFixed(1)), ph: currentTitrationPh });
    }
    return pts;
  }, [analyte, naohAdded, currentTitrationPh]);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            pH Scale &amp; Acid-Base Titration Lab
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Measure H⁺/OH⁻ concentration, dilute everyday solutions, and plot real-time NaOH titration curves.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('titration')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                mode === 'titration' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Titration Burette
            </button>
            <button
              type="button"
              onClick={() => setMode('scale')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                mode === 'scale' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              pH Solutions &amp; Dilution
            </button>
          </div>
          <select
            value={indicator}
            onChange={(e) => setIndicator(e.target.value as IndicatorType)}
            className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-medium"
          >
            <option value="universal">Universal Indicator</option>
            <option value="phenolphthalein">Phenolphthalein (pH 8.2–10)</option>
            <option value="methyl_orange">Methyl Orange (pH 3.1–4.4)</option>
            <option value="bromothymol">Bromothymol Blue (pH 6.0–7.6)</option>
          </select>
        </div>
      </div>

      {/* pH 0–14 Spectrum Strip */}
      <div className="space-y-1.5">
        <div className="relative h-5 rounded-full overflow-hidden flex border border-border">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className="flex-1 flex items-center justify-center text-[10px] font-mono font-bold text-white"
              style={{ backgroundColor: getIndicatorColor(i, 'universal') }}
            >
              {i}
            </div>
          ))}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(0,0,0,0.9)]"
            style={{ left: `calc(${(activePh / 14) * 100}% - 2px)` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between text-xs font-mono tabular-nums text-muted-foreground">
          <span>
            Live pH: <strong className="text-foreground text-sm">{activePh.toFixed(2)}</strong> (
            {activePh < 6.8 ? 'Acidic' : activePh > 7.2 ? 'Basic / Alkaline' : 'Neutral'})
          </span>
          <span>
            [H⁺] = {hConc} M · [OH⁻] = {ohConc} M
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left Flask & Burette / Dilution Controls */}
        <div className="xl:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-4">
          {/* Visual Flask */}
          <div className="flex items-center justify-center py-4 bg-slate-950 rounded-2xl border border-border relative">
            <div className="flex flex-col items-center">
              {mode === 'titration' && (
                <div className="flex flex-col items-center mb-1">
                  <div className="w-3 h-14 border-x border-slate-400 bg-sky-500/20 relative overflow-hidden">
                    <div
                      className="absolute bottom-0 inset-x-0 bg-sky-400/60"
                      style={{ height: `${Math.max(10, 100 - naohAdded * 2)}%` }}
                    />
                  </div>
                  <div className="w-1 h-3 bg-slate-400" />
                  <Droplet size={12} className="text-sky-400" />
                </div>
              )}
              <div className="w-28 h-28 rounded-b-3xl rounded-t-lg border-2 border-slate-400/70 relative overflow-hidden bg-slate-900/60 flex items-end justify-center">
                <div
                  className="w-full transition-colors duration-300"
                  style={{
                    height: mode === 'titration' ? `${Math.min(90, 42 + naohAdded)}%` : '62%',
                    backgroundColor: liquidColor,
                    opacity: 0.85,
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-white drop-shadow">
                  pH {activePh.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {mode === 'titration' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnalyte('strong');
                    setNaohAdded(0);
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-xs font-semibold',
                    analyte === 'strong'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground'
                  )}
                >
                  Strong Acid (0.1M HCl)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnalyte('weak');
                    setNaohAdded(0);
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-xs font-semibold',
                    analyte === 'weak'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground'
                  )}
                >
                  Weak Acid (CH₃COOH)
                </button>
              </div>

              <div className="flex justify-between text-xs font-mono">
                <span>0.10 M NaOH Added:</span>
                <strong>{naohAdded.toFixed(1)} mL / 50.0 mL</strong>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1, 5, 10].map((vol) => (
                  <button
                    key={vol}
                    type="button"
                    onClick={() => setNaohAdded((v) => Math.min(50, Number((v + vol).toFixed(1))))}
                    className="py-2 rounded-xl bg-card border border-border hover:border-primary text-xs font-mono font-semibold"
                  >
                    +{vol} mL
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNaohAdded(0)}
                  className="flex-1 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Reset Burette
                </button>
                {canSave && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveResult({
                        experimentTitle: `${analyte === 'strong' ? 'Strong' : 'Weak'} Acid-Base Titration`,
                        outcome: `Titrated 25 mL ${analyte === 'strong' ? 'HCl' : 'CH₃COOH'} with ${naohAdded.toFixed(1)} mL NaOH reaching pH ${currentTitrationPh}`,
                        formula: analyte === 'strong' ? 'HCl + NaOH → NaCl + H₂O' : 'CH₃COOH + NaOH → CH₃COONa + H₂O',
                        measurements: `pH: ${currentTitrationPh} | Volume NaOH: ${naohAdded.toFixed(1)} mL`,
                      })
                    }
                    className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Save size={13} />
                    <span>{saving ? 'Saving...' : 'Save Result'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Select Solution</label>
                <select
                  value={selectedSample}
                  onChange={(e) => {
                    setSelectedSample(e.target.value);
                    setWaterDilutionMl(0);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs font-medium"
                >
                  {SAMPLES.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} (pH {s.basePh})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Add Distilled Water (H₂O)</span>
                  <span className="font-mono font-semibold">+{waterDilutionMl} mL</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={25}
                  value={waterDilutionMl}
                  onChange={(e) => setWaterDilutionMl(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">{sampleObj.note}</p>
            </div>
          )}

          {feedback && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>
          )}
        </div>

        {/* Right: Recharts Titration Curve / Concentration Breakdown */}
        <div className="xl:col-span-7 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FlaskConical size={16} className="text-primary" />
              {mode === 'titration'
                ? 'Live Titration Curve (pH vs mL NaOH)'
                : 'Logarithmic Ion Balance'}
            </h3>
            {mode === 'titration' && (
              <span className="text-xs font-mono text-muted-foreground">
                Equivalence Point: 25.0 mL ({analyte === 'strong' ? 'pH 7.00' : 'pH 8.72'})
              </span>
            )}
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={titrationCurve} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="ml"
                  type="number"
                  domain={[0, 50]}
                  tickFormatter={(v) => `${v} mL`}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  domain={[0, 14]}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  formatter={(v: number) => [`pH ${v}`, 'Solution pH']}
                  labelFormatter={(l) => `NaOH Added: ${l} mL`}
                />
                <ReferenceLine x={25} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="ph"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.2}
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
