import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Save } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type MechanicsMode = 'projectile' | 'incline' | 'pendulum';

export default function MechanicsMotionLab() {
  const [mode, setMode] = useState<MechanicsMode>('projectile');
  const [gravity, setGravity] = useState<number>(9.81);
  const [running, setRunning] = useState<boolean>(true);

  // Projectile params
  const [launchSpeed, setLaunchSpeed] = useState<number>(28);
  const [launchAngle, setLaunchAngle] = useState<number>(45);

  // Inclined plane params
  const [slopeDeg, setSlopeDeg] = useState<number>(30);
  const [frictionMu, setFrictionMu] = useState<number>(0.18);
  const [massKg, setMassKg] = useState<number>(5);

  // Pendulum params
  const [pendulumLen, setPendulumLen] = useState<number>(1.8);
  const [pendulumAmpDeg, setPendulumAmpDeg] = useState<number>(32);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef<number>(0);

  const { saveResult, saving, feedback, canSave } = useSaveLabResult('physics');

  // Derived Projectile Metrics
  const rad = (launchAngle * Math.PI) / 180;
  const vx = launchSpeed * Math.cos(rad);
  const vy0 = launchSpeed * Math.sin(rad);
  const flightTime = (2 * vy0) / gravity;
  const maxHeight = (vy0 * vy0) / (2 * gravity);
  const range = vx * flightTime;

  // Derived Inclined Plane Metrics
  const slopeRad = (slopeDeg * Math.PI) / 180;
  const fgParallel = massKg * gravity * Math.sin(slopeRad);
  const normalForce = massKg * gravity * Math.cos(slopeRad);
  const frictionForce = frictionMu * normalForce;
  const netAccel = Math.max(0, (fgParallel - frictionForce) / massKg);

  // Derived Pendulum Period
  const pendulumPeriod = 2 * Math.PI * Math.sqrt(pendulumLen / gravity);

  useEffect(() => {
    tRef.current = 0;
  }, [mode, launchSpeed, launchAngle, gravity, slopeDeg, frictionMu, pendulumLen, pendulumAmpDeg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (running) {
        tRef.current += dt;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#060b16';
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (mode === 'projectile') {
        const groundY = h - 38;
        const originX = 48;
        const scale = Math.min((w - 90) / Math.max(range, 30), (h - 70) / Math.max(maxHeight, 15));

        // Ground
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, groundY);
        ctx.lineTo(w - 20, groundY);
        ctx.stroke();

        // Trajectory Curve
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let s = 0; s <= 60; s++) {
          const ts = (s / 60) * flightTime;
          const px = originX + vx * ts * scale;
          const py = groundY - (vy0 * ts - 0.5 * gravity * ts * ts) * scale;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Projectile
        const t = flightTime > 0 ? tRef.current % (flightTime + 0.6) : 0;
        const clampedT = Math.min(t, flightTime);
        const curX = originX + vx * clampedT * scale;
        const curY = groundY - Math.max(0, vy0 * clampedT - 0.5 * gravity * clampedT * clampedT) * scale;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Velocity vector arrow
        const curVy = vy0 - gravity * clampedT;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        ctx.lineTo(curX + vx * 1.1, curY - curVy * 1.1);
        ctx.stroke();
      } else if (mode === 'incline') {
        const baseRightX = w - 60;
        const baseY = h - 38;
        const run = 360;
        const rise = Math.tan(slopeRad) * run;
        const topX = baseRightX - run;
        const topY = Math.max(40, baseY - rise);

        // Ramp triangle
        ctx.fillStyle = 'rgba(51, 65, 85, 0.55)';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(baseRightX, baseY);
        ctx.lineTo(topX, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Block sliding along slope
        const hyp = Math.hypot(run, baseY - topY);
        const cycle = 3.2;
        const t = netAccel > 0.01 ? tRef.current % cycle : 0;
        const distPx = Math.min(hyp - 40, 0.5 * netAccel * t * t * 32);
        const ux = run / hyp;
        const uy = (baseY - topY) / hyp;
        const bx = topX + 20 * ux + distPx * ux;
        const by = topY + 20 * uy + distPx * uy;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(Math.atan2(baseY - topY, run));
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-16, -24, 32, 24);
        // Normal vector arrow
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(0, -56);
        ctx.stroke();
        // Friction vector arrow
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(-Math.min(50, frictionForce * 1.3), -12);
        ctx.stroke();
        ctx.restore();
      } else {
        // Simple Pendulum
        const pivotX = w / 2;
        const pivotY = 40;
        const pxLen = pendulumLen * 90;
        const omega = Math.sqrt(gravity / pendulumLen);
        const thetaMax = (pendulumAmpDeg * Math.PI) / 180;
        const theta = thetaMax * Math.cos(omega * tRef.current);
        const bobX = pivotX + Math.sin(theta) * pxLen;
        const bobY = pivotY + Math.cos(theta) * pxLen;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, running, launchSpeed, launchAngle, gravity, slopeDeg, frictionMu, massKg, pendulumLen, pendulumAmpDeg, range, maxHeight, flightTime, vx, vy0, slopeRad, netAccel, frictionForce]);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Mechanics, Inclined Planes &amp; Oscillations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Experiment with projectile trajectories, inclined plane friction vectors, and harmonic pendulums across worlds.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl">
            {(
              [
                ['projectile', 'Projectile'],
                ['incline', 'Inclined Plane'],
                ['pendulum', 'Pendulum'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                  mode === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
          >
            {running ? <Pause size={13} /> : <Play size={13} />}
            <span>{running ? 'Pause' : 'Play'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              tRef.current = 0;
            }}
            className="p-2 rounded-xl border border-border bg-muted/40 hover:bg-muted"
            title="Restart Motion"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={640}
        height={300}
        className="w-full h-[290px] sm:h-[320px] rounded-2xl border border-border bg-[#060b16]"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
          {mode === 'projectile' && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Launch Speed (v₀)</span>
                  <span className="font-mono font-semibold">{launchSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={launchSpeed}
                  onChange={(e) => setLaunchSpeed(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Launch Angle (θ)</span>
                  <span className="font-mono font-semibold">{launchAngle}°</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={launchAngle}
                  onChange={(e) => setLaunchAngle(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}

          {mode === 'incline' && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Slope Angle (θ)</span>
                  <span className="font-mono font-semibold">{slopeDeg}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={55}
                  value={slopeDeg}
                  onChange={(e) => setSlopeDeg(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Friction Coefficient (μ)</span>
                  <span className="font-mono font-semibold">{frictionMu.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.8}
                  step={0.02}
                  value={frictionMu}
                  onChange={(e) => setFrictionMu(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}

          {mode === 'pendulum' && (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">String Length (L)</span>
                  <span className="font-mono font-semibold">{pendulumLen.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.4}
                  step={0.1}
                  value={pendulumLen}
                  onChange={(e) => setPendulumLen(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Release Angle</span>
                  <span className="font-mono font-semibold">{pendulumAmpDeg}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={pendulumAmpDeg}
                  onChange={(e) => setPendulumAmpDeg(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}

          {/* Shared Gravity Presets */}
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">
              Gravity g = {gravity.toFixed(2)} m/s²
            </span>
            <div className="flex gap-1.5">
              {[
                ['Moon', 1.62],
                ['Mars', 3.72],
                ['Earth', 9.81],
                ['Jupiter', 24.79],
              ].map(([name, val]) => (
                <button
                  key={name as string}
                  type="button"
                  onClick={() => setGravity(val as number)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
                    Math.abs(gravity - (val as number)) < 0.05
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-3">
          {mode === 'projectile' && (
            <div className="space-y-1 text-xs font-mono">
              <p className="text-foreground font-semibold">Horizontal Range: {range.toFixed(1)} m</p>
              <p className="text-muted-foreground">Max Height: {maxHeight.toFixed(1)} m</p>
              <p className="text-muted-foreground">Flight Time: {flightTime.toFixed(2)} s</p>
            </div>
          )}
          {mode === 'incline' && (
            <div className="space-y-1 text-xs font-mono">
              <p className="text-foreground font-semibold">
                Net Acceleration: {netAccel.toFixed(2)} m/s² {netAccel === 0 ? '(Static Equilibrium)' : ''}
              </p>
              <p className="text-muted-foreground">
                Normal Force: {normalForce.toFixed(1)} N · Friction: {frictionForce.toFixed(1)} N
              </p>
            </div>
          )}
          {mode === 'pendulum' && (
            <div className="space-y-1 text-xs font-mono">
              <p className="text-foreground font-semibold">Period T = {pendulumPeriod.toFixed(2)} s</p>
              <p className="text-muted-foreground">
                Frequency f = {(1 / pendulumPeriod).toFixed(2)} Hz · T = 2π√(L/g)
              </p>
            </div>
          )}

          {canSave && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                saveResult({
                  experimentTitle: `Mechanics Simulation (${mode})`,
                  outcome:
                    mode === 'projectile'
                      ? `Range ${range.toFixed(1)} m, max height ${maxHeight.toFixed(1)} m at ${launchAngle}°`
                      : mode === 'incline'
                        ? `Slope ${slopeDeg}° (μ=${frictionMu}), acceleration ${netAccel.toFixed(2)} m/s²`
                        : `Pendulum L=${pendulumLen} m achieved period T=${pendulumPeriod.toFixed(2)} s`,
                  formula:
                    mode === 'projectile'
                      ? 'R = v₀² sin(2θ) / g'
                      : mode === 'incline'
                        ? 'a = g(sin θ − μ cos θ)'
                        : 'T = 2π√(L/g)',
                  measurements: `g = ${gravity} m/s²`,
                })
              }
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Mechanics Run'}</span>
            </button>
          )}
          {feedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>}
        </div>
      </div>
    </div>
  );
}
