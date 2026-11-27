import React, { useEffect, useRef, useState } from 'react';
import { FileDown, Plus, RotateCcw, Save, Zap } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

interface PointCharge {
  x: number;
  y: number;
  q: number; // +1 or -1
}

export default function EmFieldsLab() {
  const [mode, setMode] = useState<'electric' | 'magnetic'>('electric');
  const [charges, setCharges] = useState<PointCharge[]>([
    { x: 210, y: 150, q: 1 },
    { x: 430, y: 150, q: -1 },
  ]);
  const [bFieldStrength, setBFieldStrength] = useState<number>(1.4);
  const [particleSpeed, setParticleSpeed] = useState<number>(85);
  const [showEquipotential, setShowEquipotential] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const testParticleRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: 240,
    y: 120,
    vx: 0,
    vy: 0,
  });

  const { saveResult, downloadPdfReport, saving, feedback, canSave } = useSaveLabResult('physics');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let angle = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#060b16';
      ctx.fillRect(0, 0, w, h);

      if (mode === 'electric') {
        // Optional Equipotential Heatmap hints
        if (showEquipotential) {
          charges.forEach((c) => {
            for (let r = 25; r <= 125; r += 25) {
              ctx.strokeStyle =
                c.q > 0 ? 'rgba(239,68,68,0.16)' : 'rgba(56,189,248,0.16)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
              ctx.stroke();
            }
          });
        }

        // Vector Field Grid
        for (let gx = 28; gx < w; gx += 34) {
          for (let gy = 26; gy < h; gy += 34) {
            let ex = 0;
            let ey = 0;
            for (const c of charges) {
              const dx = gx - c.x;
              const dy = gy - c.y;
              const r2 = dx * dx + dy * dy + 180;
              const inv = (c.q * 6000) / Math.pow(r2, 1.5);
              ex += dx * inv;
              ey += dy * inv;
            }
            const mag = Math.hypot(ex, ey);
            if (mag < 0.001) continue;
            const len = Math.min(13, Math.max(4, mag * 6));
            const ux = (ex / mag) * len;
            const uy = (ey / mag) * len;

            ctx.strokeStyle = `rgba(148, 163, 184, ${Math.min(0.85, 0.25 + mag * 0.6)})`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(gx - ux * 0.5, gy - uy * 0.5);
            ctx.lineTo(gx + ux * 0.5, gy + uy * 0.5);
            ctx.stroke();
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(gx + ux * 0.5 - 1.5, gy + uy * 0.5 - 1.5, 3, 3);
          }
        }

        // Draw Source Charges
        charges.forEach((c) => {
          ctx.fillStyle = c.q > 0 ? '#ef4444' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(c.x, c.y, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(c.q > 0 ? '+' : '−', c.x, c.y);
        });

        // Move Test Charge gently
        const tp = testParticleRef.current;
        let fx = 0;
        let fy = 0;
        for (const c of charges) {
          const dx = tp.x - c.x;
          const dy = tp.y - c.y;
          const r2 = dx * dx + dy * dy + 160;
          const inv = (c.q * 1800) / Math.pow(r2, 1.4);
          fx += dx * inv;
          fy += dy * inv;
        }
        tp.vx = (tp.vx + fx) * 0.96;
        tp.vy = (tp.vy + fy) * 0.96;
        tp.x += tp.vx;
        tp.y += tp.vy;
        if (tp.x < 10 || tp.x > w - 10 || tp.y < 10 || tp.y > h - 10) {
          tp.x = w / 2;
          tp.y = h / 2 - 40;
          tp.vx = 0;
          tp.vy = 0;
        }
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(tp.x, tp.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Magnetic B-field (uniform into-page crosses) + Cyclotron circular Lorentz orbit
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
        ctx.lineWidth = 1.4;
        for (let gx = 40; gx < w; gx += 48) {
          for (let gy = 35; gy < h; gy += 48) {
            ctx.beginPath();
            ctx.moveTo(gx - 4, gy - 4);
            ctx.lineTo(gx + 4, gy + 4);
            ctx.moveTo(gx + 4, gy - 4);
            ctx.lineTo(gx - 4, gy + 4);
            ctx.stroke();
          }
        }

        const radius = Math.min(115, Math.max(25, particleSpeed / bFieldStrength));
        angle += 0.025 * bFieldStrength;
        const cx = w / 2;
        const cy = h / 2;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();

        // Force F toward center
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + (cx - px) * 0.45, py + (cy - py) * 0.45);
        ctx.stroke();
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [mode, charges, bFieldStrength, particleSpeed, showEquipotential]);

  const addCharge = (q: 1 | -1) => {
    if (charges.length >= 8) return;
    setCharges((prev) => [
      ...prev,
      {
        x: 140 + ((prev.length * 95) % 360),
        y: 90 + ((prev.length * 55) % 140),
        q,
      },
    ]);
  };

  const cyclotronRadius = (particleSpeed / bFieldStrength).toFixed(1);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Electric &amp; Magnetic Fields (Coulomb + Lorentz)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Place positive and negative point charges to map electric field vectors, or bend charged beams in a magnetic B-field.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setMode('electric')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
              mode === 'electric' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Electric Field E
          </button>
          <button
            type="button"
            onClick={() => setMode('magnetic')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
              mode === 'magnetic' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Magnetic Lorentz Force
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={640}
        height={290}
        className="w-full h-[270px] sm:h-[300px] rounded-2xl border border-border bg-[#060b16]"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
          {mode === 'electric' ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addCharge(1)}
                className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus size={13} /> Add +q Charge
              </button>
              <button
                type="button"
                onClick={() => addCharge(-1)}
                className="px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus size={13} /> Add −q Charge
              </button>
              <button
                type="button"
                onClick={() => setShowEquipotential((s) => !s)}
                className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-medium"
              >
                {showEquipotential ? 'Hide Equipotential' : 'Show Equipotential'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setCharges([
                    { x: 210, y: 150, q: 1 },
                    { x: 430, y: 150, q: -1 },
                  ])
                }
                className="px-3 py-2 rounded-xl border border-border bg-card text-xs font-medium flex items-center gap-1"
              >
                <RotateCcw size={13} /> Reset Dipole
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Magnetic Flux (B)</span>
                  <span className="font-mono font-semibold">{bFieldStrength.toFixed(1)} T</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={3.0}
                  step={0.1}
                  value={bFieldStrength}
                  onChange={(e) => setBFieldStrength(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Particle Velocity (v)</span>
                  <span className="font-mono font-semibold">{particleSpeed} m/s</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={140}
                  step={5}
                  value={particleSpeed}
                  onChange={(e) => setParticleSpeed(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-3">
          <div className="space-y-1 text-xs font-mono">
            <p className="text-foreground font-semibold flex items-center gap-1.5">
              <Zap size={14} className="text-primary" />
              {mode === 'electric'
                ? `${charges.length} Active Charges · Yellow = +q₀ Test Probe`
                : `Cyclotron Radius r = ${cyclotronRadius} mm`}
            </p>
            <p className="text-muted-foreground">
              {mode === 'electric' ? 'E = k·q / r²' : 'F = q(v × B) | r = mv / qB'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveResult({
                    experimentTitle: `EM Fields (${mode === 'electric' ? 'Electrostatic' : 'Lorentz B-Field'})`,
                    outcome:
                      mode === 'electric'
                        ? `Mapped electric vector field across ${charges.length} point charges`
                        : `Observed Lorentz circular orbit r=${cyclotronRadius} mm at B=${bFieldStrength} T`,
                    formula: mode === 'electric' ? 'E = kq/r²' : 'r = mv/qB',
                  })
                }
                className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 whitespace-nowrap"
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
                  snapshotDataUrl = canvasRef.current?.toDataURL('image/png');
                } catch {
                  snapshotDataUrl = undefined;
                }
                downloadPdfReport({
                  experimentTitle: `EM Fields (${mode === 'electric' ? 'Electrostatic' : 'Lorentz B-Field'})`,
                  outcome:
                    mode === 'electric'
                      ? `Mapped electric vector field and equipotential contours across ${charges.length} point charges (+q₀ test probe trajectory).`
                      : `Observed charged particle cyclotron circular orbit radius r=${cyclotronRadius} mm under magnetic flux B=${bFieldStrength.toFixed(1)} T at v=${particleSpeed} m/s.`,
                  formula: mode === 'electric' ? 'E = kq/r²' : 'F = q(v × B) | r = mv/qB',
                  measurements:
                    mode === 'electric'
                      ? `Active point charges: ${charges.length} | Equipotentials: ${showEquipotential ? 'Visible' : 'Hidden'}`
                      : `Magnetic Flux B=${bFieldStrength.toFixed(1)} T | Particle Speed v=${particleSpeed} m/s | Cyclotron r=${cyclotronRadius} mm`,
                  stepsTaken: [
                    `Selected ${mode === 'electric' ? 'Electrostatic Coulomb Vector Field' : 'Magnetic Lorentz Force'} simulation.`,
                    mode === 'electric'
                      ? `Arranged ${charges.length} source charges (${charges.filter((c) => c.q > 0).length} positive, ${charges.filter((c) => c.q < 0).length} negative).`
                      : `Adjusted uniform magnetic field B=${bFieldStrength.toFixed(1)} T and particle velocity v=${particleSpeed} m/s.`,
                    `Recorded resulting vector field and orbital dynamics.`,
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
          {feedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>}
        </div>
      </div>
    </div>
  );
}
