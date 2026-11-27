import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type OpticsMode = 'convex_lens' | 'concave_lens' | 'concave_mirror' | 'snell' | 'prism';

export default function OpticsBenchLab() {
  const [mode, setMode] = useState<OpticsMode>('convex_lens');
  const [objectDistance, setObjectDistance] = useState<number>(180); // px / cm scaled
  const [focalLength, setFocalLength] = useState<number>(85);
  const [incidentAngleDeg, setIncidentAngleDeg] = useState<number>(42);
  const [refractiveIndex, setRefractiveIndex] = useState<number>(1.52);

  const { saveResult, saving, feedback, canSave } = useSaveLabResult('physics');

  // Lens / Mirror Thin-Equation Telemetry
  const opticsCalc = useMemo(() => {
    const f = mode === 'concave_lens' ? -focalLength : focalLength;
    const dObj = objectDistance;
    const denom = dObj - f;
    if (Math.abs(denom) < 2) {
      return { di: Infinity, mag: Infinity, imageType: 'At Infinity (Parallel Rays)', inverted: false };
    }
    const di = (dObj * f) / denom;
    const mag = -di / dObj;
    const isMirror = mode === 'concave_mirror';
    const isReal = isMirror ? di > 0 : di > 0;
    return {
      di,
      mag,
      imageType: isReal ? 'Real Image' : 'Virtual Image',
      inverted: mag < 0,
    };
  }, [mode, objectDistance, focalLength]);

  // Snell's Law calculation
  const snellCalc = useMemo(() => {
    const theta1 = (incidentAngleDeg * Math.PI) / 180;
    const sinTheta2 = Math.sin(theta1) / refractiveIndex;
    const theta2 = Math.asin(Math.min(1, Math.max(-1, sinTheta2)));
    const theta2Deg = (theta2 * 180) / Math.PI;
    return { theta1, theta2, theta2Deg };
  }, [incidentAngleDeg, refractiveIndex]);

  const cx = 320;
  const cy = 170;
  const objHeight = 52;
  const objX = cx - objectDistance;
  const imgX =
    mode === 'concave_mirror'
      ? Number.isFinite(opticsCalc.di)
        ? cx - opticsCalc.di
        : -200
      : Number.isFinite(opticsCalc.di)
        ? cx + opticsCalc.di
        : 900;
  const imgHeight = Number.isFinite(opticsCalc.mag)
    ? Math.max(-120, Math.min(120, objHeight * opticsCalc.mag))
    : 0;

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Ray Optics, Refraction &amp; Dispersion Bench
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Trace principal rays through lenses and curved mirrors, test Snell&apos;s law, or disperse white light.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-muted p-1 rounded-xl">
          {(
            [
              ['convex_lens', 'Convex Lens'],
              ['concave_lens', 'Concave Lens'],
              ['concave_mirror', 'Concave Mirror'],
              ['snell', "Snell's Law"],
              ['prism', 'Dispersion Prism'],
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
      </div>

      {/* Optics Stage SVG */}
      <div className="rounded-2xl bg-slate-950 border border-border p-3 overflow-hidden">
        <svg viewBox="0 0 640 340" className="w-full h-[300px] sm:h-[340px]">
          {/* Principal Axis */}
          <line x1="20" y1={cy} x2="620" y2={cy} stroke="#475569" strokeDasharray="4 4" strokeWidth="1" />

          {(mode === 'convex_lens' || mode === 'concave_lens' || mode === 'concave_mirror') && (
            <>
              {/* Optical Element */}
              {mode === 'convex_lens' && (
                <path
                  d={`M ${cx} 45 Q ${cx + 28} ${cy} ${cx} 295 Q ${cx - 28} ${cy} ${cx} 45 Z`}
                  fill="#38bdf830"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              )}
              {mode === 'concave_lens' && (
                <path
                  d={`M ${cx - 16} 45 Q ${cx - 4} ${cy} ${cx - 16} 295 L ${cx + 16} 295 Q ${cx + 4} ${cy} ${cx + 16} 45 Z`}
                  fill="#38bdf830"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              )}
              {mode === 'concave_mirror' && (
                <path
                  d={`M ${cx - 16} 45 Q ${cx + 24} ${cy} ${cx - 16} 295`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="4"
                />
              )}

              {/* Focal Points */}
              <circle cx={cx - focalLength} cy={cy} r="4" fill="#f59e0b" />
              <text x={cx - focalLength} y={cy + 16} textAnchor="middle" fontSize="11" fill="#f59e0b">
                F
              </text>
              <circle cx={cx + focalLength} cy={cy} r="4" fill="#f59e0b" />
              <text x={cx + focalLength} y={cy + 16} textAnchor="middle" fontSize="11" fill="#f59e0b">
                F&apos;
              </text>

              {/* Object Arrow */}
              <line x1={objX} y1={cy} x2={objX} y2={cy - objHeight} stroke="#22c55e" strokeWidth="3.5" />
              <polygon points={`${objX},${cy - objHeight - 8} ${objX - 5},${cy - objHeight + 2} ${objX + 5},${cy - objHeight + 2}`} fill="#22c55e" />
              <text x={objX} y={cy + 16} textAnchor="middle" fontSize="11" fill="#22c55e">
                Object
              </text>

              {/* Principal Ray 1 (Parallel -> Through F) */}
              <line x1={objX} y1={cy - objHeight} x2={cx} y2={cy - objHeight} stroke="#facc15" strokeWidth="1.8" />
              {Number.isFinite(opticsCalc.di) && (
                <line
                  x1={cx}
                  y1={cy - objHeight}
                  x2={imgX}
                  y2={cy - imgHeight}
                  stroke="#facc15"
                  strokeWidth="1.8"
                  strokeDasharray={opticsCalc.di < 0 ? '4 4' : undefined}
                />
              )}

              {/* Principal Ray 2 (Through Center) */}
              {Number.isFinite(opticsCalc.di) && (
                <line
                  x1={objX}
                  y1={cy - objHeight}
                  x2={imgX}
                  y2={cy - imgHeight}
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeDasharray={opticsCalc.di < 0 ? '4 4' : undefined}
                />
              )}

              {/* Formed Image Arrow */}
              {Number.isFinite(opticsCalc.di) && Math.abs(imgX) < 630 && (
                <>
                  <line
                    x1={imgX}
                    y1={cy}
                    x2={imgX}
                    y2={cy - imgHeight}
                    stroke="#fb7185"
                    strokeWidth="3.5"
                    strokeDasharray={opticsCalc.di < 0 ? '4 3' : undefined}
                  />
                  <text
                    x={imgX}
                    y={imgHeight < 0 ? cy - imgHeight + 16 : cy - imgHeight - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#fb7185"
                  >
                    Image
                  </text>
                </>
              )}
            </>
          )}

          {mode === 'snell' && (
            <>
              {/* Medium Boundary */}
              <rect x="20" y={cy} width="600" height="160" fill="#0ea5e925" />
              <line x1="20" y1={cy} x2="620" y2={cy} stroke="#38bdf8" strokeWidth="2" />
              {/* Normal Line */}
              <line x1={cx} y1="20" x2={cx} y2="320" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth="1.5" />
              {/* Incident Ray */}
              <line
                x1={cx - Math.sin(snellCalc.theta1) * 145}
                y1={cy - Math.cos(snellCalc.theta1) * 145}
                x2={cx}
                y2={cy}
                stroke="#facc15"
                strokeWidth="3"
              />
              {/* Reflected Weak Ray */}
              <line
                x1={cx}
                y1={cy}
                x2={cx + Math.sin(snellCalc.theta1) * 145}
                y2={cy - Math.cos(snellCalc.theta1) * 145}
                stroke="#facc15"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* Refracted Ray */}
              <line
                x1={cx}
                y1={cy}
                x2={cx + Math.sin(snellCalc.theta2) * 150}
                y2={cy + Math.cos(snellCalc.theta2) * 150}
                stroke="#38bdf8"
                strokeWidth="3"
              />
              <text x="36" y={cy - 14} fontSize="12" fill="#cbd5e1">
                Medium 1: Air (n₁ = 1.00) · θ₁ = {incidentAngleDeg}°
              </text>
              <text x="36" y={cy + 24} fontSize="12" fill="#7dd3fc">
                Medium 2 (n₂ = {refractiveIndex.toFixed(2)}) · θ₂ = {snellCalc.theta2Deg.toFixed(1)}°
              </text>
            </>
          )}

          {mode === 'prism' && (
            <>
              {/* Glass Equilateral Prism */}
              <polygon
                points={`${cx},65 ${cx - 95},255 ${cx + 95},255`}
                fill="#38bdf822"
                stroke="#7dd3fc"
                strokeWidth="2.5"
              />
              {/* White Incident Beam */}
              <line x1="50" y1="200" x2={cx - 48} y2="160" stroke="#ffffff" strokeWidth="4" />
              {/* Dispersed Spectral Rays (ROYGBV) */}
              {[
                { color: '#ef4444', dy: 0 },
                { color: '#f97316', dy: 12 },
                { color: '#eab308', dy: 24 },
                { color: '#22c55e', dy: 36 },
                { color: '#3b82f6', dy: 48 },
                { color: '#8b5cf6', dy: 60 },
              ].map((band, i) => (
                <React.Fragment key={band.color}>
                  <line
                    x1={cx - 48}
                    y1="160"
                    x2={cx + 50 + i * 2}
                    y2={165 + band.dy * 0.4}
                    stroke={band.color}
                    strokeWidth="2"
                  />
                  <line
                    x1={cx + 50 + i * 2}
                    y1={165 + band.dy * 0.4}
                    x2="600"
                    y2={175 + band.dy * 1.9}
                    stroke={band.color}
                    strokeWidth="3"
                  />
                </React.Fragment>
              ))}
              <text x="54" y="185" fontSize="12" fill="#f8fafc">
                White Light
              </text>
              <text x="485" y="155" fontSize="11" fill="#e2e8f0">
                Violet bends strongest (higher n)
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Controls & Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
          {mode === 'snell' ? (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Incident Angle θ₁</span>
                  <span className="font-mono font-semibold">{incidentAngleDeg}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={82}
                  value={incidentAngleDeg}
                  onChange={(e) => setIncidentAngleDeg(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Refractive Index n₂</span>
                  <span className="font-mono font-semibold">{refractiveIndex.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={1.1}
                  max={2.42}
                  step={0.02}
                  value={refractiveIndex}
                  onChange={(e) => setRefractiveIndex(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Object Distance (d₀)</span>
                  <span className="font-mono font-semibold">{objectDistance} cm</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={270}
                  value={objectDistance}
                  onChange={(e) => setObjectDistance(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Focal Length (f)</span>
                  <span className="font-mono font-semibold">{focalLength} cm</span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={140}
                  value={focalLength}
                  onChange={(e) => setFocalLength(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}
        </div>

        <div className="md:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-3">
          {mode === 'snell' ? (
            <div className="space-y-1 text-xs font-mono">
              <p className="text-muted-foreground">Formula: n₁ sin θ₁ = n₂ sin θ₂</p>
              <p className="text-foreground font-semibold">
                Refracted θ₂ = {snellCalc.theta2Deg.toFixed(2)}°
              </p>
            </div>
          ) : mode === 'prism' ? (
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-foreground">Chromatic Dispersion</p>
              <p className="text-muted-foreground">
                Shorter wavelengths (400 nm violet) experience higher refractive index and bend more than 700 nm red.
              </p>
            </div>
          ) : (
            <div className="space-y-1 text-xs font-mono">
              <p className="text-foreground font-semibold">
                {opticsCalc.imageType} {opticsCalc.inverted ? '(Inverted)' : '(Upright)'}
              </p>
              <p className="text-muted-foreground">
                dᵢ = {Number.isFinite(opticsCalc.di) ? `${opticsCalc.di.toFixed(1)} cm` : '∞'} · M ={' '}
                {Number.isFinite(opticsCalc.mag) ? `${opticsCalc.mag.toFixed(2)}×` : '∞'}
              </p>
            </div>
          )}

          {canSave && (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                saveResult({
                  experimentTitle: `Optics Bench (${mode.replace('_', ' ')})`,
                  outcome:
                    mode === 'snell'
                      ? `Snell refraction: θ₁=${incidentAngleDeg}° → θ₂=${snellCalc.theta2Deg.toFixed(1)}° (n=${refractiveIndex})`
                      : `${opticsCalc.imageType}, magnification ${Number.isFinite(opticsCalc.mag) ? opticsCalc.mag.toFixed(2) : '∞'}×`,
                  formula: mode === 'snell' ? 'n₁ sin θ₁ = n₂ sin θ₂' : '1/f = 1/d₀ + 1/dᵢ',
                  measurements: `f=${focalLength} cm | d₀=${objectDistance} cm`,
                })
              }
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Optics Result'}</span>
            </button>
          )}
          {feedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>}
        </div>
      </div>
    </div>
  );
}
