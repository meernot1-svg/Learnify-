import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Cpu, Play, Pause, Save, Zap } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type ElectricalTab = 'circuits' | 'oscilloscope' | 'logic';
type CircuitTopology = 'series' | 'parallel' | 'divider' | 'led';
type WaveShape = 'sine' | 'square' | 'triangle' | 'sawtooth';
type LogicGateKind = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'HALF_ADDER';

export default function ElectricalLabSuite() {
  const [tab, setTab] = useState<ElectricalTab>('circuits');
  const { saveResult, saving, feedback, canSave } = useSaveLabResult('electrical');

  // 1. DC Circuit Solver state
  const [topology, setTopology] = useState<CircuitTopology>('series');
  const [sourceVolts, setSourceVolts] = useState<number>(12);
  const [r1, setR1] = useState<number>(220);
  const [r2, setR2] = useState<number>(470);
  const [switchClosed, setSwitchClosed] = useState<boolean>(true);

  const circuitTelemetry = useMemo(() => {
    if (!switchClosed) {
      return { req: Infinity, iTotalMa: 0, v1: 0, v2: 0, powerMw: 0, ledWarning: false };
    }
    if (topology === 'series') {
      const req = r1 + r2;
      const i = sourceVolts / req;
      return {
        req,
        iTotalMa: i * 1000,
        v1: i * r1,
        v2: i * r2,
        powerMw: sourceVolts * i * 1000,
        ledWarning: false,
      };
    }
    if (topology === 'parallel') {
      const req = (r1 * r2) / (r1 + r2);
      const i = sourceVolts / req;
      return {
        req,
        iTotalMa: i * 1000,
        v1: sourceVolts,
        v2: sourceVolts,
        powerMw: sourceVolts * i * 1000,
        ledWarning: false,
      };
    }
    if (topology === 'divider') {
      const req = r1 + r2;
      const vOut = sourceVolts * (r2 / req);
      const i = sourceVolts / req;
      return {
        req,
        iTotalMa: i * 1000,
        v1: sourceVolts - vOut,
        v2: vOut,
        powerMw: sourceVolts * i * 1000,
        ledWarning: false,
      };
    }
    // LED + Current Limiting Resistor R1 (LED Vf ~ 2.0V)
    const drop = Math.max(0, sourceVolts - 2.0);
    const i = drop / r1;
    const iMa = i * 1000;
    return {
      req: r1,
      iTotalMa: iMa,
      v1: drop,
      v2: sourceVolts >= 2 ? 2.0 : sourceVolts,
      powerMw: sourceVolts * i * 1000,
      ledWarning: iMa > 30,
    };
  }, [topology, sourceVolts, r1, r2, switchClosed]);

  // 2. AC Oscilloscope state
  const [shape, setShape] = useState<WaveShape>('sine');
  const [freqHz, setFreqHz] = useState<number>(60);
  const [ampV, setAmpV] = useState<number>(5);
  const [phaseDeg, setPhaseDeg] = useState<number>(45);
  const [enableRcFilter, setEnableRcFilter] = useState<boolean>(true);
  const [oscRunning, setOscRunning] = useState<boolean>(true);
  const oscCanvasRef = useRef<HTMLCanvasElement>(null);
  const oscTimeRef = useRef<number>(0);

  useEffect(() => {
    if (tab !== 'oscilloscope') return;
    const canvas = oscCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const evalShape = (ph: number) => {
      const s = ((ph / (Math.PI * 2)) % 1 + 1) % 1;
      if (shape === 'sine') return Math.sin(ph);
      if (shape === 'square') return s < 0.5 ? 1 : -1;
      if (shape === 'triangle') return 1 - 4 * Math.abs(Math.round(s - 0.25) - (s - 0.25));
      return 2 * s - 1;
    };

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (oscRunning) oscTimeRef.current += dt;

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#040914';
      ctx.fillRect(0, 0, w, h);

      // Oscilloscope Graticule
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += h / 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const scaleY = (h * 0.36) / 10;
      const cyclesShown = (freqHz / 30) * 1.5;

      // Channel 1 (Input Cyan)
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 2) {
        const ph = (px / w) * Math.PI * 2 * cyclesShown - oscTimeRef.current * 4;
        const v = evalShape(ph) * ampV;
        const py = h / 2 - v * scaleY;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Channel 2 (Phase-Shifted / Filtered Output Amber)
      const fc = 80;
      const gain = enableRcFilter ? 1 / Math.sqrt(1 + Math.pow(freqHz / fc, 2)) : 1;
      const shiftRad = (phaseDeg * Math.PI) / 180;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px <= w; px += 2) {
        const ph = (px / w) * Math.PI * 2 * cyclesShown - oscTimeRef.current * 4 - shiftRad;
        const v = evalShape(ph) * ampV * gain;
        const py = h / 2 - v * scaleY;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [tab, shape, freqHz, ampV, phaseDeg, enableRcFilter, oscRunning]);

  // 3. Digital Logic Gates state
  const [gateKind, setGateKind] = useState<LogicGateKind>('XOR');
  const [inA, setInA] = useState<0 | 1>(1);
  const [inB, setInB] = useState<0 | 1>(0);

  const evalGate = (g: LogicGateKind, a: number, b: number): { out: number; carry?: number; expr: string } => {
    switch (g) {
      case 'AND':
        return { out: a & b, expr: 'Y = A · B' };
      case 'OR':
        return { out: a | b, expr: 'Y = A + B' };
      case 'NOT':
        return { out: a ? 0 : 1, expr: 'Y = Ā' };
      case 'NAND':
        return { out: a & b ? 0 : 1, expr: 'Y = ¬(A · B)' };
      case 'NOR':
        return { out: a | b ? 0 : 1, expr: 'Y = ¬(A + B)' };
      case 'XOR':
        return { out: a ^ b, expr: 'Y = A ⊕ B' };
      case 'XNOR':
        return { out: a ^ b ? 0 : 1, expr: 'Y = ¬(A ⊕ B)' };
      case 'HALF_ADDER':
        return { out: a ^ b, carry: a & b, expr: 'Sum = A ⊕ B, Carry = A · B' };
    }
  };

  const gateRes = evalGate(gateKind, inA, inB);
  const truthRows =
    gateKind === 'NOT'
      ? [
          { a: 0, b: 0, ...evalGate(gateKind, 0, 0) },
          { a: 1, b: 0, ...evalGate(gateKind, 1, 0) },
        ]
      : [
          { a: 0, b: 0, ...evalGate(gateKind, 0, 0) },
          { a: 0, b: 1, ...evalGate(gateKind, 0, 1) },
          { a: 1, b: 0, ...evalGate(gateKind, 1, 0) },
          { a: 1, b: 1, ...evalGate(gateKind, 1, 1) },
        ];

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Electrical Engineering &amp; Electronics Lab
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analyze DC circuits with Ohm&apos;s law, probe AC waveforms on an oscilloscope, and test Boolean logic gates.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-muted p-1 rounded-xl">
          {(
            [
              ['circuits', 'DC Circuits', Zap],
              ['oscilloscope', 'AC Oscilloscope', Activity],
              ['logic', 'Digital Logic Gates', Cpu],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap',
                tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'circuits' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Interactive Circuit Schematic Stage */}
          <div className="xl:col-span-7 rounded-2xl bg-slate-950 border border-border p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['series', 'Series Loop'],
                    ['parallel', 'Parallel Branches'],
                    ['divider', 'Voltage Divider'],
                    ['led', 'LED + Resistor'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTopology(id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border',
                      topology === id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSwitchClosed((s) => !s)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-mono font-bold border',
                  switchClosed
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500 text-rose-300'
                )}
              >
                SWITCH: {switchClosed ? 'CLOSED' : 'OPEN'}
              </button>
            </div>

            <svg viewBox="0 0 420 210" className="w-full h-52">
              {/* Outer Wire Loop */}
              <rect
                x="55"
                y="35"
                width="310"
                height="140"
                rx="10"
                fill="none"
                stroke={switchClosed ? '#22d3ee' : '#475569'}
                strokeWidth="3"
              />
              {/* Battery Source */}
              <rect x="35" y="82" width="40" height="46" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="55" y="108" textAnchor="middle" fontSize="11" fill="#f59e0b" fontWeight="bold">
                {sourceVolts}V
              </text>

              {/* Top Switch Gap indicator */}
              {!switchClosed && <line x1="150" y1="35" x2="195" y2="20" stroke="#ef4444" strokeWidth="3.5" />}

              {/* Component R1 */}
              <rect x="195" y="21" width="90" height="28" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <text x="240" y="39" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontFamily="monospace">
                R₁={r1}Ω
              </text>

              {/* Second Component (R2 or LED) */}
              {topology === 'led' ? (
                <g transform="translate(365, 105)">
                  <circle
                    r="22"
                    fill={
                      !switchClosed
                        ? '#1e293b'
                        : circuitTelemetry.ledWarning
                          ? '#ef4444'
                          : sourceVolts >= 2
                            ? '#22c55e'
                            : '#334155'
                    }
                    stroke="#cbd5e1"
                    strokeWidth="2"
                  />
                  <text y="4" textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="bold">
                    {circuitTelemetry.ledWarning ? 'OVER!' : 'LED'}
                  </text>
                </g>
              ) : (
                <>
                  <rect x="195" y="161" width="90" height="28" rx="6" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
                  <text x="240" y="179" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontFamily="monospace">
                    R₂={r2}Ω
                  </text>
                </>
              )}

              {topology === 'parallel' && (
                <line x1="295" y1="35" x2="295" y2="175" stroke={switchClosed ? '#22d3ee' : '#475569'} strokeWidth="2.5" />
              )}
            </svg>

            <p className="text-xs font-mono text-slate-400 text-center">
              {circuitTelemetry.ledWarning
                ? 'Warning: Current exceeds 30 mA LED rating — increase R₁ resistance!'
                : switchClosed
                  ? `Conventional current flowing: ${circuitTelemetry.iTotalMa.toFixed(1)} mA`
                  : 'Circuit open — zero current flow (I = 0 mA)'}
            </p>
          </div>

          {/* Controls & Meter Readouts */}
          <div className="xl:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Source Voltage (Vs)</span>
                  <span className="font-mono font-semibold">{sourceVolts} V</span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={24}
                  step={0.5}
                  value={sourceVolts}
                  onChange={(e) => setSourceVolts(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Resistor R₁</span>
                  <span className="font-mono font-semibold">{r1} Ω</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={2000}
                  step={10}
                  value={r1}
                  onChange={(e) => setR1(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              {topology !== 'led' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Resistor R₂</span>
                    <span className="font-mono font-semibold">{r2} Ω</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={2000}
                    step={10}
                    value={r2}
                    onChange={(e) => setR2(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-[11px] text-muted-foreground">Total Current (I)</p>
                  <p className="font-bold text-cyan-600 dark:text-cyan-400">
                    {circuitTelemetry.iTotalMa.toFixed(2)} mA
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-[11px] text-muted-foreground">Req / Power</p>
                  <p className="font-bold text-foreground">
                    {Number.isFinite(circuitTelemetry.req) ? `${circuitTelemetry.req.toFixed(0)} Ω` : '∞'} ·{' '}
                    {circuitTelemetry.powerMw.toFixed(0)} mW
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-[11px] text-muted-foreground">Drop V₁</p>
                  <p className="font-bold text-foreground">{circuitTelemetry.v1.toFixed(2)} V</p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-[11px] text-muted-foreground">
                    {topology === 'divider' ? 'Vout (across R₂)' : 'Drop V₂'}
                  </p>
                  <p className="font-bold text-foreground">{circuitTelemetry.v2.toFixed(2)} V</p>
                </div>
              </div>
            </div>

            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveResult({
                    experimentTitle: `DC Circuit (${topology})`,
                    outcome: `Vs=${sourceVolts}V, I=${circuitTelemetry.iTotalMa.toFixed(2)} mA, P=${circuitTelemetry.powerMw.toFixed(1)} mW`,
                    formula: 'V = I · R, P = V · I',
                    measurements: `R₁=${r1}Ω | R₂=${r2}Ω`,
                  })
                }
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Circuit Measurement'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'oscilloscope' && (
        <div className="space-y-4">
          <canvas
            ref={oscCanvasRef}
            width={640}
            height={280}
            className="w-full h-[270px] rounded-2xl border border-border bg-[#040914]"
          />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-mono font-semibold">{freqHz} Hz</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={240}
                  step={5}
                  value={freqHz}
                  onChange={(e) => setFreqHz(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Peak Amplitude</span>
                  <span className="font-mono font-semibold">{ampV} Vp</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={ampV}
                  onChange={(e) => setAmpV(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">CH2 Phase Shift</span>
                  <span className="font-mono font-semibold">{phaseDeg}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={phaseDeg}
                  onChange={(e) => setPhaseDeg(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
            <div className="md:col-span-4 p-4 rounded-2xl bg-muted/30 border border-border space-y-2.5">
              <div className="flex gap-1.5 flex-wrap">
                {(['sine', 'square', 'triangle', 'sawtooth'] as WaveShape[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setShape(w)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold capitalize border',
                      shape === w ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEnableRcFilter((f) => !f)}
                  className="flex-1 py-1.5 rounded-lg border border-border bg-card text-xs font-medium"
                >
                  RC Filter: {enableRcFilter ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => setOscRunning((r) => !r)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1"
                >
                  {oscRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{oscRunning ? 'Hold' : 'Run'}</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-muted-foreground">
                Vrms (Sine): {(ampV / Math.SQRT2).toFixed(2)} V · T = {(1000 / freqHz).toFixed(1)} ms
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'logic' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-7 p-5 rounded-2xl bg-slate-950 border border-border space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'HALF_ADDER'] as LogicGateKind[]).map(
                (g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGateKind(g)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-mono font-bold border',
                      gateKind === g
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    )}
                  >
                    {g === 'HALF_ADDER' ? 'Half Adder' : g}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center justify-around py-6">
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setInA((a) => (a ? 0 : 1))}
                  className={cn(
                    'w-24 py-2.5 rounded-xl font-mono text-sm font-bold border block',
                    inA ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                  )}
                >
                  A = {inA}
                </button>
                {gateKind !== 'NOT' && (
                  <button
                    type="button"
                    onClick={() => setInB((b) => (b ? 0 : 1))}
                    className={cn(
                      'w-24 py-2.5 rounded-xl font-mono text-sm font-bold border block',
                      inB ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-400'
                    )}
                  >
                    B = {inB}
                  </button>
                )}
              </div>

              <div className="px-6 py-5 rounded-2xl border-2 border-cyan-400/50 bg-slate-900 text-center">
                <p className="font-mono text-lg font-bold text-cyan-300">
                  {gateKind === 'HALF_ADDER' ? 'HALF ADDER' : gateKind}
                </p>
                <p className="font-mono text-[11px] text-slate-400 mt-1">{gateRes.expr}</p>
              </div>

              <div className="space-y-2 text-center">
                <div
                  className={cn(
                    'w-24 py-2.5 rounded-xl font-mono text-sm font-bold border',
                    gateRes.out
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  )}
                >
                  {gateKind === 'HALF_ADDER' ? `Sum = ${gateRes.out}` : `Y = ${gateRes.out}`}
                </div>
                {gateRes.carry !== undefined && (
                  <div
                    className={cn(
                      'w-24 py-2 rounded-xl font-mono text-xs font-bold border',
                      gateRes.carry
                        ? 'bg-amber-400 text-slate-950 border-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    )}
                  >
                    Carry = {gateRes.carry}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Live Truth Table</h3>
            <table className="w-full text-left text-xs font-mono border border-border rounded-xl overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="py-2 px-3">A</th>
                  {gateKind !== 'NOT' && <th className="py-2 px-3">B</th>}
                  <th className="py-2 px-3">{gateKind === 'HALF_ADDER' ? 'Sum' : 'Output Y'}</th>
                  {gateKind === 'HALF_ADDER' && <th className="py-2 px-3">Carry</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {truthRows.map((row, idx) => {
                  const isActive =
                    row.a === inA && (gateKind === 'NOT' || row.b === inB);
                  return (
                    <tr key={idx} className={isActive ? 'bg-primary/15 font-bold' : ''}>
                      <td className="py-2 px-3">{row.a}</td>
                      {gateKind !== 'NOT' && <td className="py-2 px-3">{row.b}</td>}
                      <td className="py-2 px-3 text-primary">{row.out}</td>
                      {gateKind === 'HALF_ADDER' && <td className="py-2 px-3">{row.carry}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveResult({
                    experimentTitle: `Digital Logic (${gateKind})`,
                    outcome: `Verified ${gateKind} truth table (${gateRes.expr})`,
                    formula: gateRes.expr,
                  })
                }
                className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Logic Experiment'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{feedback.text}</p>
      )}
    </div>
  );
}
