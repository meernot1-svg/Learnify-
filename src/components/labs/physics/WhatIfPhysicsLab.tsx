import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Markdown from 'react-markdown';
import {
  FileDown,
  Loader2,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { aiService } from '../../../services/ai';
import { useLanguage } from '../../../hooks/useLanguage';
import { cn } from '../../../lib/utils';

type WhatIfScenario = 'freefall-drag' | 'force-friction' | 'projectile-drag';

const GRAVITY_PRESETS = [
  { label: 'Moon', g: 1.62 },
  { label: 'Mars', g: 3.71 },
  { label: 'Earth', g: 9.81 },
  { label: 'Jupiter', g: 24.79 },
];

export default function WhatIfPhysicsLab() {
  const { language } = useLanguage();
  const [scenario, setScenario] = useState<WhatIfScenario>('freefall-drag');

  // Shared & Scenario Parameters
  const [gravity, setGravity] = useState<number>(9.81);
  const [massKg, setMassKg] = useState<number>(10);
  const [dragCoeff, setDragCoeff] = useState<number>(0.24);
  const [appliedForceN, setAppliedForceN] = useState<number>(85);
  const [frictionMu, setFrictionMu] = useState<number>(0.22);
  const [launchSpeed, setLaunchSpeed] = useState<number>(32);
  const [launchAngle, setLaunchAngle] = useState<number>(45);

  // Student Prediction + AI Analysis
  const [predictionText, setPredictionText] = useState<string>('');
  const [aiCommentary, setAiCommentary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { saveResult, downloadPdfReport, saving, feedback, canSave } = useSaveLabResult('physics');

  // --- Numerical Physics Models ---
  const freefallSeries = useMemo(() => {
    const dt = 0.25;
    const totalSteps = 40; // 0 to 10s
    let v = 0;
    let y = 0;
    const points: Array<{
      t: number;
      velocity: number;
      terminalV: number | null;
      netForce: number;
      dragForce: number;
      weightForce: number;
      distance: number;
    }> = [];

    const weight = massKg * gravity;
    const vt = dragCoeff > 0.005 ? Math.sqrt(weight / dragCoeff) : null;

    for (let i = 0; i <= totalSteps; i++) {
      const t = +(i * dt).toFixed(2);
      const drag = dragCoeff * v * v;
      const fNet = Math.max(0, weight - drag);
      points.push({
        t,
        velocity: +v.toFixed(2),
        terminalV: vt ? +vt.toFixed(2) : null,
        netForce: +fNet.toFixed(1),
        dragForce: +drag.toFixed(1),
        weightForce: +weight.toFixed(1),
        distance: +y.toFixed(1),
      });
      const a = fNet / massKg;
      v += a * dt;
      y += v * dt;
    }
    return {
      points,
      weight: +weight.toFixed(1),
      terminalVelocity: vt ? +vt.toFixed(2) : null,
      finalVelocity: points[points.length - 1].velocity,
      finalDistance: points[points.length - 1].distance,
    };
  }, [gravity, massKg, dragCoeff]);

  const forceMotionSeries = useMemo(() => {
    const normal = massKg * gravity;
    const friction = +(frictionMu * normal).toFixed(1);
    const netForce = +(Math.max(0, appliedForceN - friction)).toFixed(1);
    const accel = +(netForce / massKg).toFixed(2);

    const points: Array<{
      t: number;
      velocity: number;
      displacement: number;
      kineticEnergy: number;
    }> = [];

    for (let t = 0; t <= 10; t += 1) {
      const v = +(accel * t).toFixed(2);
      const d = +(0.5 * accel * t * t).toFixed(1);
      const ke = +(0.5 * massKg * v * v).toFixed(1);
      points.push({ t, velocity: v, displacement: d, kineticEnergy: ke });
    }

    const forceBreakdown = [
      { name: 'Applied Force', newtons: +appliedForceN.toFixed(1) },
      { name: 'Friction Resistance', newtons: friction },
      { name: 'Net Accelerating Force', newtons: netForce },
    ];

    return {
      normal: +normal.toFixed(1),
      friction,
      netForce,
      accel,
      points,
      forceBreakdown,
      isStaticLocked: appliedForceN <= friction,
    };
  }, [appliedForceN, frictionMu, massKg, gravity]);

  const projectileSeries = useMemo(() => {
    const rad = (launchAngle * Math.PI) / 180;
    const vx0 = launchSpeed * Math.cos(rad);
    const vy0 = launchSpeed * Math.sin(rad);
    const dt = 0.1;

    // Ideal vacuum flight + dragged Euler trajectory
    let xIdeal = 0;
    let yIdeal = 0;
    let vyIdeal = vy0;

    let xDrag = 0;
    let yDrag = 0;
    let vxDrag = vx0;
    let vyDrag = vy0;

    const linearDrag = dragCoeff * 0.28; // air resistance damping factor (1/s)
    const points: Array<{
      t: number;
      idealHeight: number;
      dragHeight: number;
      idealSpeed: number;
      dragSpeed: number;
    }> = [];

    let maxIdealH = 0;
    let maxDragH = 0;
    let rangeIdeal = 0;
    let rangeDrag = 0;

    for (let step = 0; step <= 80; step++) {
      const t = +(step * dt).toFixed(1);
      if (yIdeal < 0 && yDrag < 0 && step > 1) break;

      const clampedIdealY = Math.max(0, yIdeal);
      const clampedDragY = Math.max(0, yDrag);
      maxIdealH = Math.max(maxIdealH, clampedIdealY);
      maxDragH = Math.max(maxDragH, clampedDragY);

      if (yIdeal >= 0) rangeIdeal = xIdeal;
      if (yDrag >= 0) rangeDrag = xDrag;

      points.push({
        t,
        idealHeight: +clampedIdealY.toFixed(2),
        dragHeight: +clampedDragY.toFixed(2),
        idealSpeed: +Math.hypot(vx0, vyIdeal).toFixed(1),
        dragSpeed: +Math.hypot(vxDrag, vyDrag).toFixed(1),
      });

      // Step ideal
      if (yIdeal >= 0 || step === 0) {
        xIdeal += vx0 * dt;
        vyIdeal -= gravity * dt;
        yIdeal += vyIdeal * dt;
      }

      // Step with air resistance
      if (yDrag >= 0 || step === 0) {
        const ax = -(linearDrag / Math.max(1, massKg * 0.15)) * vxDrag;
        const ay = -gravity - (linearDrag / Math.max(1, massKg * 0.15)) * vyDrag;
        vxDrag += ax * dt;
        vyDrag += ay * dt;
        xDrag += vxDrag * dt;
        yDrag += vyDrag * dt;
      }
    }

    return {
      points,
      maxIdealH: +maxIdealH.toFixed(1),
      maxDragH: +maxDragH.toFixed(1),
      rangeIdeal: +rangeIdeal.toFixed(1),
      rangeDrag: +rangeDrag.toFixed(1),
    };
  }, [launchSpeed, launchAngle, gravity, dragCoeff, massKg]);

  const activeSummary = useMemo(() => {
    if (scenario === 'freefall-drag') {
      return {
        title: 'What-If Gravity & Air Resistance Free-Fall',
        formula: 'F_net = m*g - k*v^2',
        measurements: `g=${gravity} m/s^2, m=${massKg} kg, Drag k=${dragCoeff} kg/m, Terminal v=${
          freefallSeries.terminalVelocity ? `${freefallSeries.terminalVelocity} m/s` : 'Unbounded (Vacuum)'
        }`,
        outcome: `Simulated 10s drop at g=${gravity} m/s^2 reaches ${freefallSeries.finalVelocity} m/s across ${freefallSeries.finalDistance} m.`,
      };
    }
    if (scenario === 'force-friction') {
      return {
        title: 'What-If Applied Force vs Friction Motion',
        formula: 'F_net = F_applied - mu*m*g, a = F_net / m',
        measurements: `F=${appliedForceN} N, mu=${frictionMu}, m=${massKg} kg, g=${gravity} m/s^2, F_net=${forceMotionSeries.netForce} N, a=${forceMotionSeries.accel} m/s^2`,
        outcome: forceMotionSeries.isStaticLocked
          ? `Applied force (${appliedForceN} N) does not overcome frictional resistance (${forceMotionSeries.friction} N); object remains stationary.`
          : `Net accelerating force ${forceMotionSeries.netForce} N produces a=${forceMotionSeries.accel} m/s^2.`,
      };
    }
    return {
      title: 'What-If Gravity & Drag Projectile Motion',
      formula: 'a_y = -g - (c/m)*v_y, a_x = -(c/m)*v_x',
      measurements: `v0=${launchSpeed} m/s, angle=${launchAngle} deg, g=${gravity} m/s^2, drag=${dragCoeff}`,
      outcome: `Ideal range ${projectileSeries.rangeIdeal} m vs aerodynamic drag range ${projectileSeries.rangeDrag} m (peak ${projectileSeries.maxDragH} m).`,
    };
  }, [
    scenario,
    gravity,
    massKg,
    dragCoeff,
    appliedForceN,
    frictionMu,
    launchSpeed,
    launchAngle,
    freefallSeries,
    forceMotionSeries,
    projectileSeries,
  ]);

  const askAiWhatIf = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await aiService.labAssistant({
        action: 'what-if',
        subject: 'physics (What-If Force & Motion Lab)',
        topic: activeSummary.title,
        context: `Parameters: ${activeSummary.measurements}\nResult: ${activeSummary.outcome}\nStudent Prediction: ${
          predictionText.trim() || 'None entered'
        }\nExplain clearly how changing gravity or resistance alters the force balance and motion curves. Distinguish this simplified model from complex real-world aerodynamics.`,
        language,
      });
      setAiCommentary(response);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to reach AI What-If explainer.');
    } finally {
      setAiLoading(false);
    }
  };

  const resetDefaults = () => {
    setGravity(9.81);
    setMassKg(10);
    setDragCoeff(0.24);
    setAppliedForceN(85);
    setFrictionMu(0.22);
    setLaunchSpeed(32);
    setLaunchAngle(45);
    setAiCommentary('');
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
      {/* Header & Scenario Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Sliders size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">What-If Physics Laboratory</h2>
            <p className="text-xs text-muted-foreground">
              Adjust gravity, mass, applied force, and resistance in real time to observe live force &amp; motion Recharts curves.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'freefall-drag', label: 'Gravity & Air Drag' },
              { id: 'force-friction', label: 'Force vs Friction' },
              { id: 'projectile-drag', label: 'Projectile + Drag' },
            ] as Array<{ id: WhatIfScenario; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScenario(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                scenario === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Controls + Planetary Gravity Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4 bg-muted/30 border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Simulation Variables
            </span>
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          {/* Planetary Gravity Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground">Gravity Quick Presets</span>
            <div className="grid grid-cols-4 gap-1.5">
              {GRAVITY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setGravity(p.g)}
                  className={cn(
                    'py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer',
                    Math.abs(gravity - p.g) < 0.05
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Gravity (g)</span>
              <span className="text-primary tabular-nums">{gravity} m/s²</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={0.1}
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>

          <label className="block space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span>Mass (m)</span>
              <span className="text-primary tabular-nums">{massKg} kg</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={massKg}
              onChange={(e) => setMassKg(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>

          {scenario !== 'force-friction' && (
            <label className="block space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span>Air Resistance (k)</span>
                <span className="text-primary tabular-nums">{dragCoeff.toFixed(2)} kg/m</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.02}
                value={dragCoeff}
                onChange={(e) => setDragCoeff(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </label>
          )}

          {scenario === 'force-friction' && (
            <>
              <label className="block space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Applied Push Force (F)</span>
                  <span className="text-primary tabular-nums">{appliedForceN} N</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={400}
                  step={5}
                  value={appliedForceN}
                  onChange={(e) => setAppliedForceN(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Surface Friction (μ)</span>
                  <span className="text-primary tabular-nums">{frictionMu.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.02}
                  value={frictionMu}
                  onChange={(e) => setFrictionMu(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
            </>
          )}

          {scenario === 'projectile-drag' && (
            <>
              <label className="block space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Launch Speed (v₀)</span>
                  <span className="text-primary tabular-nums">{launchSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  step={1}
                  value={launchSpeed}
                  onChange={(e) => setLaunchSpeed(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>

              <label className="block space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Launch Angle (θ)</span>
                  <span className="text-primary tabular-nums">{launchAngle}°</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={80}
                  step={1}
                  value={launchAngle}
                  onChange={(e) => setLaunchAngle(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
            </>
          )}

          {/* Hypothesis Prediction Prompt */}
          <div className="pt-2 border-t border-border space-y-2">
            <label className="block text-[11px] font-bold text-muted-foreground">
              Your What-If Hypothesis (Optional)
            </label>
            <textarea
              rows={2}
              value={predictionText}
              onChange={(e) => setPredictionText(e.target.value)}
              placeholder="Predict how changing gravity or resistance affects motion..."
              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Real-Time Recharts Simulation Outcomes */}
        <div className="lg:col-span-8 space-y-4">
          {/* Live Telemetry Readouts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scenario === 'freefall-drag' && (
              <>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weight Force (mg)</p>
                  <p className="text-lg font-black tabular-nums mt-0.5">{freefallSeries.weight} N</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Terminal Velocity</p>
                  <p className="text-lg font-black tabular-nums text-primary mt-0.5">
                    {freefallSeries.terminalVelocity ? `${freefallSeries.terminalVelocity} m/s` : 'Vacuum (∞)'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distance Fallen (10s)</p>
                  <p className="text-lg font-black tabular-nums mt-0.5">{freefallSeries.finalDistance} m</p>
                </div>
              </>
            )}

            {scenario === 'force-friction' && (
              <>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Friction Force (μmg)</p>
                  <p className="text-lg font-black tabular-nums text-rose-500 mt-0.5">{forceMotionSeries.friction} N</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Force</p>
                  <p className="text-lg font-black tabular-nums text-primary mt-0.5">{forceMotionSeries.netForce} N</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Net Acceleration</p>
                  <p className="text-lg font-black tabular-nums text-emerald-500 mt-0.5">{forceMotionSeries.accel} m/s²</p>
                </div>
              </>
            )}

            {scenario === 'projectile-drag' && (
              <>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ideal Range (No Drag)</p>
                  <p className="text-lg font-black tabular-nums mt-0.5">{projectileSeries.rangeIdeal} m</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Range With Air Drag</p>
                  <p className="text-lg font-black tabular-nums text-primary mt-0.5">{projectileSeries.rangeDrag} m</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/35 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Peak Height (Drag)</p>
                  <p className="text-lg font-black tabular-nums text-emerald-500 mt-0.5">{projectileSeries.maxDragH} m</p>
                </div>
              </>
            )}
          </div>

          {/* Primary Recharts Charts */}
          {scenario === 'freefall-drag' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-muted/25 border border-border space-y-2">
                <p className="text-xs font-bold">Velocity Over Time (m/s)</p>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={freefallSeries.points}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area
                        type="monotone"
                        dataKey="velocity"
                        name="Fall Speed (m/s)"
                        stroke="#f4b400"
                        fill="#f4b400"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                      {freefallSeries.terminalVelocity && (
                        <Line
                          type="monotone"
                          dataKey="terminalV"
                          name="Terminal Velocity"
                          stroke="#10b981"
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/25 border border-border space-y-2">
                <p className="text-xs font-bold">Net Force vs Air Drag Over Time (N)</p>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={freefallSeries.points}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="netForce" name="Net Force (N)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="dragForce" name="Air Drag (N)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {scenario === 'force-friction' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-muted/25 border border-border space-y-2">
                <p className="text-xs font-bold">Velocity &amp; Displacement Over Time</p>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forceMotionSeries.points}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="velocity" name="Velocity (m/s)" stroke="#10b981" strokeWidth={2.2} />
                      <Line type="monotone" dataKey="displacement" name="Displacement (m)" stroke="#f4b400" strokeWidth={2.2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/25 border border-border space-y-2">
                <p className="text-xs font-bold">Force Balance Comparison (N)</p>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forceMotionSeries.forceBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="newtons" name="Force (N)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {scenario === 'projectile-drag' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-muted/25 border border-border space-y-2">
                <p className="text-xs font-bold">Height Comparison: Ideal Vacuum vs Air Drag (m)</p>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectileSeries.points}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area
                        type="monotone"
                        dataKey="idealHeight"
                        name="Ideal Height (m)"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.14}
                        strokeDasharray="4 4"
                      />
                      <Area
                        type="monotone"
                        dataKey="dragHeight"
                        name="Height w/ Resistance (m)"
                        stroke="#f4b400"
                        fill="#f4b400"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted/25 border border-border space-y-2">
                <p className="text-xs font-bold">Projectile Speed Over Time (m/s)</p>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projectileSeries.points}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} unit="s" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="idealSpeed" name="Ideal Speed (m/s)" stroke="#6366f1" strokeDasharray="4 4" dot={false} />
                      <Line type="monotone" dataKey="dragSpeed" name="Speed w/ Drag (m/s)" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar: AI What-If Explanation + Save to Firestore + Export PDF */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={aiLoading}
                onClick={askAiWhatIf}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Analyze What-If Outcome with AI</span>
              </button>

              {canSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveResult({
                      experimentTitle: activeSummary.title,
                      outcome: activeSummary.outcome,
                      formula: activeSummary.formula,
                      measurements: activeSummary.measurements,
                      notes: predictionText.trim()
                        ? `Prediction: ${predictionText.trim()}`
                        : 'Observed via What-If Physics Recharts Simulator',
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted border border-border text-xs font-bold hover:border-primary cursor-pointer"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save Result'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  downloadPdfReport({
                    experimentTitle: activeSummary.title,
                    outcome: activeSummary.outcome,
                    formula: activeSummary.formula,
                    measurements: activeSummary.measurements,
                    notes: aiCommentary || predictionText || 'What-If Force & Motion simulation summary.',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted border border-border text-xs font-bold hover:border-primary cursor-pointer"
              >
                <FileDown size={14} />
                <span>PDF Report</span>
              </button>
            </div>

            {feedback && (
              <span
                className={cn(
                  'text-xs font-bold',
                  feedback.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                )}
              >
                {feedback.text}
              </span>
            )}
          </div>

          {aiError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-bold text-rose-500">
              {aiError}
            </div>
          )}

          {aiCommentary && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{aiCommentary}</Markdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
