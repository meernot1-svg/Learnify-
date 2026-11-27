import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Box, Calculator, Compass, Dice5, FileDown, Save, TrendingUp } from 'lucide-react';
import { compileMathExpression } from '../../../lib/safeMathParser';
import { createThreeViewport, disposeObject3D } from '../threeHelpers';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type MathTab = 'calculus' | 'geometry3d' | 'trig' | 'probability';
type SolidKind = 'cube' | 'tetrahedron' | 'octahedron' | 'dodecahedron' | 'icosahedron' | 'cone' | 'cylinder' | 'torus';

const SOLIDS: Record<
  SolidKind,
  { label: string; euler: string; formulaVol: string; formulaArea: string }
> = {
  cube: { label: 'Cube', euler: 'V=8, E=12, F=6 (V−E+F=2)', formulaVol: 's³', formulaArea: '6s²' },
  tetrahedron: { label: 'Tetrahedron', euler: 'V=4, E=6, F=4 (V−E+F=2)', formulaVol: '(√2/12)a³', formulaArea: '√3 a²' },
  octahedron: { label: 'Octahedron', euler: 'V=6, E=12, F=8 (V−E+F=2)', formulaVol: '(√2/3)a³', formulaArea: '2√3 a²' },
  dodecahedron: { label: 'Dodecahedron', euler: 'V=20, E=30, F=12 (V−E+F=2)', formulaVol: '7.66 a³', formulaArea: '20.65 a²' },
  icosahedron: { label: 'Icosahedron', euler: 'V=12, E=30, F=20 (V−E+F=2)', formulaVol: '2.18 a³', formulaArea: '8.66 a²' },
  cone: { label: 'Circular Cone', euler: 'Curved Lateral Surface', formulaVol: '⅓ πr²h', formulaArea: 'πr(r + l)' },
  cylinder: { label: 'Cylinder', euler: '2 Bases + Lateral Wall', formulaVol: 'πr²h', formulaArea: '2πr(r + h)' },
  torus: { label: 'Torus', euler: 'Genus 1 Surface (V−E+F=0)', formulaVol: '2π²Rr²', formulaArea: '4π²Rr' },
};

export default function MathLabSuite() {
  const [tab, setTab] = useState<MathTab>('calculus');
  const { saveResult, downloadPdfReport, recordStep, saving, feedback, canSave } = useSaveLabResult('math');

  // 1. Calculus & Function Grapher state
  const [expr1, setExpr1] = useState<string>('sin(x) + 0.25*x^2');
  const [expr2, setExpr2] = useState<string>('cos(x)');
  const [tangentX, setTangentX] = useState<number>(1.2);
  const [integralA, setIntegralA] = useState<number>(-2);
  const [integralB, setIntegralB] = useState<number>(2);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);

  const fn1 = useMemo(() => compileMathExpression(expr1), [expr1]);
  const fn2 = useMemo(() => compileMathExpression(expr2), [expr2]);

  const calculusStats = useMemo(() => {
    if (!fn1) return null;
    const h = 0.0005;
    const fx0 = fn1(tangentX);
    const deriv = (fn1(tangentX + h) - fn1(tangentX - h)) / (2 * h);
    const a = Math.min(integralA, integralB);
    const b = Math.max(integralA, integralB);
    const n = 40;
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const mid = a + (i + 0.5) * dx;
      const val = fn1(mid);
      if (Number.isFinite(val)) sum += val * dx;
    }
    return { fx0, deriv, integral: sum };
  }, [fn1, tangentX, integralA, integralB]);

  useEffect(() => {
    if (tab !== 'calculus') return;
    const canvas = graphCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#060b16';
    ctx.fillRect(0, 0, w, h);

    const xMin = -6;
    const xMax = 6;
    const yMin = -4;
    const yMax = 4;
    const toPx = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
    const toPy = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.1)';
    ctx.lineWidth = 1;
    for (let gx = Math.ceil(xMin); gx <= xMax; gx++) {
      ctx.beginPath();
      ctx.moveTo(toPx(gx), 0);
      ctx.lineTo(toPx(gx), h);
      ctx.stroke();
    }
    for (let gy = Math.ceil(yMin); gy <= yMax; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, toPy(gy));
      ctx.lineTo(w, toPy(gy));
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = 'rgba(226,232,240,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, toPy(0));
    ctx.lineTo(w, toPy(0));
    ctx.moveTo(toPx(0), 0);
    ctx.lineTo(toPx(0), h);
    ctx.stroke();

    // Riemann integral rectangles
    if (fn1) {
      const a = Math.min(integralA, integralB);
      const b = Math.max(integralA, integralB);
      const steps = 28;
      const dx = (b - a) / steps;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      for (let i = 0; i < steps; i++) {
        const xm = a + (i + 0.5) * dx;
        const ym = fn1(xm);
        if (!Number.isFinite(ym)) continue;
        const px1 = toPx(a + i * dx);
        const px2 = toPx(a + (i + 1) * dx);
        const py0 = toPy(0);
        const pyVal = toPy(ym);
        ctx.fillRect(px1, Math.min(py0, pyVal), px2 - px1, Math.abs(py0 - pyVal));
        ctx.strokeRect(px1, Math.min(py0, pyVal), px2 - px1, Math.abs(py0 - pyVal));
      }
    }

    // Plot fn2
    if (fn2) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let px = 0; px <= w; px += 2) {
        const x = xMin + (px / w) * (xMax - xMin);
        const y = fn2(x);
        if (!Number.isFinite(y) || Math.abs(y) > 25) {
          started = false;
          continue;
        }
        const py = toPy(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // Plot fn1
    if (fn1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      let started = false;
      for (let px = 0; px <= w; px += 2) {
        const x = xMin + (px / w) * (xMax - xMin);
        const y = fn1(x);
        if (!Number.isFinite(y) || Math.abs(y) > 25) {
          started = false;
          continue;
        }
        const py = toPy(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Tangent Line at x0
      if (calculusStats && Number.isFinite(calculusStats.fx0) && Number.isFinite(calculusStats.deriv)) {
        const x1 = tangentX - 1.8;
        const x2 = tangentX + 1.8;
        const y1 = calculusStats.fx0 + calculusStats.deriv * (x1 - tangentX);
        const y2 = calculusStats.fx0 + calculusStats.deriv * (x2 - tangentX);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toPx(x1), toPy(y1));
        ctx.lineTo(toPx(x2), toPy(y2));
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(toPx(tangentX), toPy(calculusStats.fx0), 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [tab, fn1, fn2, tangentX, integralA, integralB, calculusStats]);

  // 2. 3D Geometry state
  const [solidKind, setSolidKind] = useState<SolidKind>('dodecahedron');
  const [solidScale, setSolidScale] = useState<number>(1.3);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<boolean>(false);
  const polyMountRef = useRef<HTMLDivElement>(null);
  const polySnapshotRef = useRef<(() => string | null) | null>(null);

  useEffect(() => {
    if (tab !== 'geometry3d') return;
    const mount = polyMountRef.current;
    if (!mount) return;

    const ctx = createThreeViewport(mount, {
      background: 0x060b16,
      cameraPos: [0, 1.8, 4.4],
      minDistance: 2,
      maxDistance: 12,
      onContextLost: (lost) => setWebglError(lost),
    });
    if (!ctx) {
      setWebglError(true);
      return;
    }
    setWebglError(false);

    const { scene, camera, renderer, controls, afterDraw, captureSnapshot, dispose } = ctx;
    polySnapshotRef.current = captureSnapshot;
    let geometry: THREE.BufferGeometry;
    switch (solidKind) {
      case 'cube':
        geometry = new THREE.BoxGeometry(solidScale * 1.4, solidScale * 1.4, solidScale * 1.4);
        break;
      case 'tetrahedron':
        geometry = new THREE.TetrahedronGeometry(solidScale * 1.15);
        break;
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(solidScale * 1.1);
        break;
      case 'dodecahedron':
        geometry = new THREE.DodecahedronGeometry(solidScale * 1.05);
        break;
      case 'icosahedron':
        geometry = new THREE.IcosahedronGeometry(solidScale * 1.05);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(solidScale * 0.9, solidScale * 1.7, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(solidScale * 0.78, solidScale * 0.78, solidScale * 1.65, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(solidScale * 0.85, solidScale * 0.32, 20, 48);
        break;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.3,
      metalness: 0.15,
      wireframe,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xfda4af, transparent: true, opacity: 0.75 })
    );
    if (!wireframe) mesh.add(edges);

    const clock = new THREE.Clock();
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      mesh.rotation.y += dt * 0.55;
      mesh.rotation.x += dt * 0.2;
      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };
    afterDraw(tick);

    return () => {
      mounted = false;
      polySnapshotRef.current = null;
      disposeObject3D(mesh);
      dispose();
    };
  }, [tab, solidKind, solidScale, wireframe]);

  const solidStats = useMemo(() => {
    const a = solidScale;
    let vol = 0;
    let area = 0;
    if (solidKind === 'cube') {
      vol = a * a * a;
      area = 6 * a * a;
    } else if (solidKind === 'tetrahedron') {
      vol = (Math.SQRT2 / 12) * Math.pow(a, 3);
      area = Math.sqrt(3) * a * a;
    } else if (solidKind === 'octahedron') {
      vol = (Math.SQRT2 / 3) * Math.pow(a, 3);
      area = 2 * Math.sqrt(3) * a * a;
    } else if (solidKind === 'dodecahedron') {
      vol = 7.663 * Math.pow(a, 3);
      area = 20.646 * a * a;
    } else if (solidKind === 'icosahedron') {
      vol = 2.182 * Math.pow(a, 3);
      area = 8.66 * a * a;
    } else if (solidKind === 'cone') {
      vol = (Math.PI * a * a * (a * 1.5)) / 3;
      area = Math.PI * a * (a + Math.hypot(a, a * 1.5));
    } else if (solidKind === 'cylinder') {
      vol = Math.PI * a * a * (a * 1.6);
      area = 2 * Math.PI * a * (a + a * 1.6);
    } else {
      const r = a * 0.35;
      vol = 2 * Math.PI * Math.PI * a * r * r;
      area = 4 * Math.PI * Math.PI * a * r;
    }
    return { vol: vol.toFixed(2), area: area.toFixed(2) };
  }, [solidKind, solidScale]);

  // 3. Trig Unit Circle state
  const [angleDeg, setAngleDeg] = useState<number>(38);
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);
  const tanVal = Math.abs(cosVal) < 0.001 ? Infinity : Math.tan(angleRad);

  // 4. Probability Monte Carlo state
  const [trials, setTrials] = useState<number>(200);
  const [diceCounts, setDiceCounts] = useState<{ sum: string; freq: number }[]>(() => {
    const counts: Record<number, number> = {};
    for (let s = 2; s <= 12; s++) counts[s] = 0;
    for (let i = 0; i < 200; i++) {
      const roll = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
      counts[roll]++;
    }
    return Object.entries(counts).map(([sum, freq]) => ({ sum, freq }));
  });

  const runDiceSim = (n: number) => {
    setTrials(n);
    const counts: Record<number, number> = {};
    for (let s = 2; s <= 12; s++) counts[s] = 0;
    for (let i = 0; i < n; i++) {
      const roll = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
      counts[roll]++;
    }
    setDiceCounts(Object.entries(counts).map(([sum, freq]) => ({ sum, freq })));
    recordStep(`Executed Monte Carlo simulation for ${n} paired dice rolls.`);
  };

  const captureGraphSnapshot = (): string | undefined => {
    try {
      return graphCanvasRef.current?.toDataURL('image/png');
    } catch {
      return undefined;
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Interactive Mathematics Virtual Lab
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Graph functions with calculus tangents &amp; integrals, inspect 3D polyhedra, explore unit-circle trig, and run probability simulations.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-muted p-1 rounded-xl">
          {(
            [
              ['calculus', 'Function & Calculus', TrendingUp],
              ['geometry3d', '3D Geometry', Box],
              ['trig', 'Unit Circle Trig', Compass],
              ['probability', 'Probability Lab', Dice5],
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

      {tab === 'calculus' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 space-y-3">
            <canvas
              ref={graphCanvasRef}
              width={640}
              height={340}
              className="w-full h-[320px] rounded-2xl border border-border bg-[#060b16]"
            />
          </div>
          <div className="xl:col-span-4 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-sky-500">f(x) Primary Function</label>
                <input
                  type="text"
                  value={expr1}
                  onChange={(e) => setExpr1(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-card border border-border font-mono text-xs"
                  placeholder="sin(x) + 0.25*x^2"
                />
                {!fn1 && <p className="text-[11px] text-rose-500 mt-0.5">Syntax error in f(x)</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-purple-500">g(x) Comparison Curve</label>
                <input
                  type="text"
                  value={expr2}
                  onChange={(e) => setExpr2(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-card border border-border font-mono text-xs"
                  placeholder="cos(x)"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Tangent Point x₀</span>
                  <span className="font-mono font-semibold">{tangentX.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.1}
                  value={tangentX}
                  onChange={(e) => setTangentX(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Integral Lower a</label>
                  <input
                    type="number"
                    step={0.5}
                    value={integralA}
                    onChange={(e) => setIntegralA(Number(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-card border border-border font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Integral Upper b</label>
                  <input
                    type="number"
                    step={0.5}
                    value={integralB}
                    onChange={(e) => setIntegralB(Number(e.target.value))}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-card border border-border font-mono text-xs"
                  />
                </div>
              </div>

              {calculusStats && (
                <div className="p-3 rounded-xl bg-card border border-border space-y-1 text-xs font-mono">
                  <p>f({tangentX.toFixed(1)}) = {calculusStats.fx0.toFixed(3)}</p>
                  <p className="text-amber-600 dark:text-amber-400">
                    f&apos;({tangentX.toFixed(1)}) Slope = {calculusStats.deriv.toFixed(3)}
                  </p>
                  <p className="text-sky-600 dark:text-sky-400">
                    ∫[{integralA}, {integralB}] f(x)dx ≈ {calculusStats.integral.toFixed(3)}
                  </p>
                </div>
              )}
            </div>

            {calculusStats && (
              <div className="flex flex-wrap gap-2">
                {canSave && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveResult({
                        experimentTitle: `Calculus Analysis: f(x) = ${expr1}`,
                        outcome: `Slope at x=${tangentX} is ${calculusStats.deriv.toFixed(3)}; definite integral on [${integralA}, ${integralB}] ≈ ${calculusStats.integral.toFixed(3)}`,
                        formula: expr1,
                        measurements: `g(x)=${expr2 || 'none'} | x0=${tangentX.toFixed(1)} | f(x0)=${calculusStats.fx0.toFixed(3)}`,
                      })
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Save size={14} />
                    <span>{saving ? 'Saving...' : 'Save Study'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    downloadPdfReport({
                      experimentTitle: `Calculus Analysis: f(x) = ${expr1}`,
                      outcome: `At x0=${tangentX.toFixed(1)}, f(x0)=${calculusStats.fx0.toFixed(3)} and instantaneous derivative slope f'(x0)=${calculusStats.deriv.toFixed(3)}. Definite integral over [${integralA}, ${integralB}] is approximately ${calculusStats.integral.toFixed(3)}.`,
                      formula: `f(x) = ${expr1}; g(x) = ${expr2 || 'none'}`,
                      measurements: `Tangent x0=${tangentX.toFixed(1)} | Interval [${integralA}, ${integralB}] | Riemann n=40`,
                      stepsTaken: [
                        `Plotted primary curve f(x) = ${expr1} and comparison curve g(x) = ${expr2 || 'none'}.`,
                        `Positioned tangent line probe at x0 = ${tangentX.toFixed(1)} to compute f'(x0) = ${calculusStats.deriv.toFixed(3)}.`,
                        `Evaluated midpoint Riemann integral over [${integralA}, ${integralB}] yielding ${calculusStats.integral.toFixed(3)}.`,
                      ],
                      snapshotDataUrl: captureGraphSnapshot(),
                    })
                  }
                  className="py-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <FileDown size={14} />
                  <span>PDF Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'geometry3d' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 h-[380px] rounded-2xl overflow-hidden border border-border bg-[#060b16]">
            {webglError ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-xs">
                WebGL paused
              </div>
            ) : (
              <div ref={polyMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}
          </div>
          <div className="xl:col-span-4 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(SOLIDS) as SolidKind[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSolidKind(s);
                      recordStep(`Inspected 3D ${SOLIDS[s].label} (${SOLIDS[s].euler}).`);
                    }}
                    className={cn(
                      'py-2 px-2.5 rounded-xl border text-xs font-semibold text-left',
                      solidKind === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:border-primary/40'
                    )}
                  >
                    {SOLIDS[s].label}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Characteristic Scale (a / r)</span>
                  <span className="font-mono font-semibold">{solidScale.toFixed(1)} units</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={2.0}
                  step={0.1}
                  value={solidScale}
                  onChange={(e) => setSolidScale(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setWireframe((w) => {
                    const next = !w;
                    recordStep(`Toggled 3D geometry mesh to ${next ? 'Wireframe' : 'Shaded Solid'}.`);
                    return next;
                  });
                }}
                className="w-full py-2 rounded-xl border border-border bg-card text-xs font-semibold"
              >
                {wireframe ? 'Switch to Shaded Solid' : 'Switch to Wireframe Mesh'}
              </button>
              <div className="p-3 rounded-xl bg-card border border-border text-xs font-mono space-y-1">
                <p className="font-semibold text-foreground">{SOLIDS[solidKind].euler}</p>
                <p className="text-muted-foreground">
                  Volume ({SOLIDS[solidKind].formulaVol}) = {solidStats.vol} u³
                </p>
                <p className="text-muted-foreground">
                  Surface Area ({SOLIDS[solidKind].formulaArea}) = {solidStats.area} u²
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveResult({
                      experimentTitle: `3D Geometry: ${SOLIDS[solidKind].label}`,
                      outcome: `${SOLIDS[solidKind].euler} · Vol = ${solidStats.vol}, SA = ${solidStats.area}`,
                      formula: `V = ${SOLIDS[solidKind].formulaVol}`,
                      measurements: `Scale=${solidScale.toFixed(1)} | Mode=${wireframe ? 'Wireframe' : 'Shaded'}`,
                    })
                  }
                  className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save Geometry'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  downloadPdfReport({
                    experimentTitle: `3D Geometry: ${SOLIDS[solidKind].label}`,
                    outcome: `Verified topological properties (${SOLIDS[solidKind].euler}) at scale ${solidScale.toFixed(1)} units: Volume = ${solidStats.vol} u³ and Surface Area = ${solidStats.area} u².`,
                    formula: `V = ${SOLIDS[solidKind].formulaVol} | SA = ${SOLIDS[solidKind].formulaArea}`,
                    measurements: `Scale a=${solidScale.toFixed(1)} | Volume=${solidStats.vol} u³ | Area=${solidStats.area} u²`,
                    stepsTaken: [
                      `Selected 3D polyhedron/solid: ${SOLIDS[solidKind].label}.`,
                      `Adjusted characteristic radius/edge scale to ${solidScale.toFixed(1)} units.`,
                      `Verified ${SOLIDS[solidKind].euler} and computed volume/surface area.`,
                    ],
                    snapshotDataUrl: polySnapshotRef.current?.() ?? undefined,
                  })
                }
                className="py-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <FileDown size={14} />
                <span>PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'trig' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-6 rounded-2xl bg-slate-950 border border-border p-4 flex justify-center">
            <svg viewBox="-130 -130 260 260" className="w-64 h-64">
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="-120" x2="0" y2="120" stroke="#334155" strokeWidth="1" />
              <circle cx="0" cy="0" r="90" fill="none" stroke="#475569" strokeWidth="1.5" />
              {/* cos projection */}
              <line x1="0" y1="0" x2={cosVal * 90} y2="0" stroke="#22c55e" strokeWidth="3" />
              {/* sin projection */}
              <line x1={cosVal * 90} y1="0" x2={cosVal * 90} y2={-sinVal * 90} stroke="#ef4444" strokeWidth="3" />
              {/* radius vector */}
              <line x1="0" y1="0" x2={cosVal * 90} y2={-sinVal * 90} stroke="#38bdf8" strokeWidth="2.5" />
              <circle cx={cosVal * 90} cy={-sinVal * 90} r="5.5" fill="#facc15" />
            </svg>
          </div>
          <div className="md:col-span-6 p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Angle (θ)</span>
                <span className="font-mono font-semibold">
                  {angleDeg}° ({(angleDeg / 180).toFixed(2)}π rad)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={angleDeg}
                onChange={(e) => setAngleDeg(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-rose-500">sin(θ)</p>
                <p className="text-base font-bold mt-0.5">{sinVal.toFixed(4)}</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-emerald-500">cos(θ)</p>
                <p className="text-base font-bold mt-0.5">{cosVal.toFixed(4)}</p>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-sky-500">tan(θ)</p>
                <p className="text-base font-bold mt-0.5">
                  {Number.isFinite(tanVal) ? tanVal.toFixed(3) : '∞'}
                </p>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Identity check: sin²θ + cos²θ = {(sinVal * sinVal + cosVal * cosVal).toFixed(4)}
            </p>
            <div className="flex flex-wrap gap-2">
              {canSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveResult({
                      experimentTitle: `Unit Circle Trig: θ = ${angleDeg}°`,
                      outcome: `sin(${angleDeg}°)=${sinVal.toFixed(4)}, cos(${angleDeg}°)=${cosVal.toFixed(4)}, tan(${angleDeg}°)=${Number.isFinite(tanVal) ? tanVal.toFixed(3) : '∞'}`,
                      formula: 'sin²θ + cos²θ = 1',
                      measurements: `θ=${angleDeg}° (${angleRad.toFixed(3)} rad)`,
                    })
                  }
                  className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save Trig Study'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  downloadPdfReport({
                    experimentTitle: `Unit Circle Trigonometry: θ = ${angleDeg}°`,
                    outcome: `At θ=${angleDeg}° (${(angleDeg / 180).toFixed(2)}π rad), sin(θ)=${sinVal.toFixed(4)}, cos(θ)=${cosVal.toFixed(4)}, tan(θ)=${Number.isFinite(tanVal) ? tanVal.toFixed(3) : 'undefined'}. Pythagorean identity verified: sin²θ+cos²θ=${(sinVal * sinVal + cosVal * cosVal).toFixed(4)}.`,
                    formula: 'sin²θ + cos²θ = 1, tanθ = sinθ / cosθ',
                    measurements: `θ=${angleDeg}° | sin=${sinVal.toFixed(4)} | cos=${cosVal.toFixed(4)}`,
                    stepsTaken: [
                      `Rotated unit circle radius vector to θ = ${angleDeg}° (${angleRad.toFixed(3)} radians).`,
                      `Measured horizontal cos(θ) projection (${cosVal.toFixed(4)}) and vertical sin(θ) projection (${sinVal.toFixed(4)}).`,
                      `Confirmed Pythagorean trigonometric identity sin²θ + cos²θ = 1.`,
                    ],
                  })
                }
                className="py-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <FileDown size={14} />
                <span>PDF Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'probability' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Monte Carlo Sum of 2 Fair Dice ({trials} simulated trials) — converges toward Triangular Distribution peaking at 7.
            </p>
            <div className="flex gap-2">
              {[50, 200, 1000, 5000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => runDiceSim(n)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono',
                    trials === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground hover:bg-muted'
                  )}
                >
                  Roll {n}×
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full p-3 rounded-2xl bg-muted/20 border border-border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diceCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sum" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip />
                <Bar dataKey="freq" name="Frequency" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const peak = [...diceCounts].sort((a, b) => b.freq - a.freq)[0];
                  saveResult({
                    experimentTitle: `Monte Carlo Probability (${trials} Rolls)`,
                    outcome: `Simulated ${trials} dual-dice rolls; empirical modal sum was ${peak?.sum} (${peak?.freq} hits).`,
                    formula: 'P(Sum = 7) = 6/36 = 16.67%',
                    measurements: diceCounts.map((d) => `${d.sum}:${d.freq}`).join(' '),
                  });
                }}
                className="py-2 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Probability Study'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const peak = [...diceCounts].sort((a, b) => b.freq - a.freq)[0];
                downloadPdfReport({
                  experimentTitle: `Monte Carlo Probability (${trials} Paired Dice Trials)`,
                  outcome: `Executed ${trials} independent trials summing two fair 6-sided dice. Peak empirical outcome was sum ${peak?.sum} occurring ${peak?.freq} times (${trials > 0 ? ((peak.freq / trials) * 100).toFixed(1) : '0'}%), illustrating convergence toward the theoretical triangular distribution.`,
                  formula: 'E[X₁ + X₂] = 7, P(Sum = 7) = 1/6',
                  measurements: diceCounts.map((d) => `Sum ${d.sum}: ${d.freq}`).join(' | '),
                  stepsTaken: [
                    `Configured stochastic Monte Carlo sample size to N = ${trials} trials.`,
                    `Aggregated frequency histogram across sums 2 through 12.`,
                    `Observed convergence toward mean μ = 7 as N increased.`,
                  ],
                });
              }}
              className="py-2 px-3.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileDown size={14} />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Calculator size={14} /> {feedback.text}
        </p>
      )}
    </div>
  );
}
