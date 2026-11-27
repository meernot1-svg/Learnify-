import React, { useEffect, useRef, useState } from 'react';
import { FileDown, Pause, Play, Save } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type WaveMode = 'transverse' | 'longitudinal' | 'superposition' | 'standing' | 'doppler';

export default function WavesAcousticsLab() {
  const [mode, setMode] = useState<WaveMode>('transverse');
  const [freq, setFreq] = useState<number>(2.5);
  const [freq2, setFreq2] = useState<number>(3.0);
  const [amplitude, setAmplitude] = useState<number>(48);
  const [harmonic, setHarmonic] = useState<number>(3);
  const [sourceSpeed, setSourceSpeed] = useState<number>(0.45); // Mach fraction for Doppler
  const [playing, setPlaying] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<number>(0);
  const { saveResult, downloadPdfReport, saving, feedback, canSave } = useSaveLabResult('physics');

  const waveSpeed = 340;
  const wavelength = waveSpeed / freq;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (playing) phaseRef.current += dt;
      const t = phaseRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#060b16';
      ctx.fillRect(0, 0, w, h);

      const midY = h / 2;
      ctx.strokeStyle = 'rgba(148,163,184,0.16)';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      if (mode === 'transverse') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const y = midY - Math.sin((x / 95) * freq - t * 4) * amplitude;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Highlight one oscillating medium particle
        const px = 220;
        const py = midY - Math.sin((px / 95) * freq - t * 4) * amplitude;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (mode === 'longitudinal') {
        for (let row = -2; row <= 2; row++) {
          for (let col = 1; col <= 34; col++) {
            const x0 = col * 18;
            const shift = Math.sin((x0 / 75) * freq - t * 4) * (amplitude * 0.25);
            const y0 = midY + row * 24;
            ctx.fillStyle = shift > 2 ? '#38bdf8' : shift < -2 ? '#64748b' : '#cbd5e1';
            ctx.beginPath();
            ctx.arc(x0 + shift, y0, 3.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (mode === 'superposition') {
        // Wave 1 dashed cyan
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = midY - Math.sin((x / 95) * freq - t * 3.5) * (amplitude * 0.55);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Wave 2 dashed purple
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) {
          const y = midY - Math.sin((x / 95) * freq2 - t * 3.5) * (amplitude * 0.55);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Resultant solid emerald
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const y1 = Math.sin((x / 95) * freq - t * 3.5) * (amplitude * 0.55);
          const y2 = Math.sin((x / 95) * freq2 - t * 3.5) * (amplitude * 0.55);
          const y = midY - (y1 + y2);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (mode === 'standing') {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 30; x <= w - 30; x += 3) {
          const norm = (x - 30) / (w - 60);
          const y =
            midY -
            Math.sin(harmonic * Math.PI * norm) * Math.cos(t * 4.5) * (amplitude * 1.15);
          if (x === 30) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw standing nodes
        for (let k = 0; k <= harmonic; k++) {
          const nx = 30 + (k / harmonic) * (w - 60);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(nx, midY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Doppler Effect moving source wavefronts
        const cPx = 90;
        const vSrc = sourceSpeed * cPx;
        const srcX = 120 + ((t * vSrc) % (w - 200));
        for (let k = 0; k < 10; k++) {
          const age = k * 0.42 + (t % 0.42);
          const cx = srcX - vSrc * age;
          const r = cPx * age;
          ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0.1, 0.9 - age * 0.2)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, midY, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(srcX, midY, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, freq, freq2, amplitude, harmonic, sourceSpeed, playing]);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Waves, Interference, Harmonics &amp; Doppler Lab
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualize transverse/longitudinal propagation, constructive superposition, standing harmonics, and Doppler compression.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl overflow-x-auto max-w-full">
            {(
              [
                ['transverse', 'Transverse'],
                ['longitudinal', 'Longitudinal'],
                ['superposition', 'Interference'],
                ['standing', 'Standing Waves'],
                ['doppler', 'Doppler Effect'],
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
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={640}
        height={270}
        className="w-full h-[260px] sm:h-[290px] rounded-2xl border border-border bg-[#060b16]"
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
          {mode === 'standing' ? (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Harmonic Number (n)</span>
                <span className="font-mono font-semibold">n = {harmonic}</span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                step={1}
                value={harmonic}
                onChange={(e) => setHarmonic(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          ) : mode === 'doppler' ? (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Source Mach (v / c)</span>
                <span className="font-mono font-semibold">{sourceSpeed.toFixed(2)} c</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={sourceSpeed}
                onChange={(e) => setSourceSpeed(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Frequency (f₁)</span>
                <span className="font-mono font-semibold">{freq.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={6}
                step={0.2}
                value={freq}
                onChange={(e) => setFreq(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {mode === 'superposition' ? (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Wave 2 Frequency (f₂)</span>
                <span className="font-mono font-semibold">{freq2.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={6}
                step={0.2}
                value={freq2}
                onChange={(e) => setFreq2(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Amplitude (A)</span>
                <span className="font-mono font-semibold">{amplitude} px</span>
              </div>
              <input
                type="range"
                min={16}
                max={85}
                value={amplitude}
                onChange={(e) => setAmplitude(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>

        <div className="md:col-span-5 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-3">
          <div className="space-y-1 text-xs font-mono">
            <p className="text-foreground font-semibold">
              {mode === 'standing'
                ? `${harmonic} Antinodes · ${harmonic + 1} Nodes`
                : mode === 'superposition'
                  ? `Beat Frequency |f₁ − f₂| = ${Math.abs(freq - freq2).toFixed(1)} Hz`
                  : mode === 'doppler'
                    ? `Approaching shift: ${(1 / (1 - sourceSpeed)).toFixed(2)}× f₀`
                    : `Wavelength λ = ${wavelength.toFixed(1)} m (at 340 m/s)`}
            </p>
            <p className="text-muted-foreground">v = f · λ · T = {(1 / freq).toFixed(2)} s</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveResult({
                    experimentTitle: `Waves Simulation (${mode})`,
                    outcome: `Analyzed ${mode} wave at f=${freq.toFixed(1)} Hz, A=${amplitude}`,
                    formula: 'v = f · λ',
                    measurements: `λ=${wavelength.toFixed(1)} m`,
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
                  experimentTitle: `Waves Simulation (${mode})`,
                  outcome:
                    mode === 'standing'
                      ? `Observed ${harmonic} antinodes and ${harmonic + 1} nodes on standing harmonic string.`
                      : mode === 'superposition'
                        ? `Measured wave interference beat frequency |f₁ − f₂| = ${Math.abs(freq - freq2).toFixed(1)} Hz.`
                        : mode === 'doppler'
                          ? `Simulated Doppler wavefront compression at source Mach ${sourceSpeed.toFixed(2)}c (approaching shift ${(1 / (1 - sourceSpeed)).toFixed(2)}× f₀).`
                          : `Analyzed ${mode} propagation at frequency f=${freq.toFixed(1)} Hz and amplitude A=${amplitude} px (wavelength λ=${wavelength.toFixed(1)} m).`,
                  formula: mode === 'doppler' ? "f' = f₀ / (1 - v/c)" : 'v = f · λ',
                  measurements: `Frequency f₁=${freq.toFixed(1)} Hz | Wavelength λ=${wavelength.toFixed(1)} m | Amplitude=${amplitude} px`,
                  stepsTaken: [
                    `Selected ${mode} acoustics & wave simulator.`,
                    `Configured frequency f=${freq.toFixed(1)} Hz and amplitude A=${amplitude} px.`,
                    `Analyzed live phase propagation and wave interference nodes.`,
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
