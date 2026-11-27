import React, { useMemo, useState } from 'react';
import { FileDown, Save } from 'lucide-react';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

function wavelengthToRgb(nm: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / 60;
    b = 1;
  } else if (nm >= 440 && nm < 490) {
    g = (nm - 440) / 50;
    b = 1;
  } else if (nm >= 490 && nm < 510) {
    g = 1;
    b = -(nm - 510) / 20;
  } else if (nm >= 510 && nm < 580) {
    r = (nm - 510) / 70;
    g = 1;
  } else if (nm >= 580 && nm < 645) {
    r = 1;
    g = -(nm - 645) / 65;
  } else if (nm >= 645 && nm <= 750) {
    r = 1;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export default function ColorMixingLab() {
  const [mode, setMode] = useState<'rgb' | 'cmyk' | 'spectrum'>('rgb');
  const [r, setR] = useState<number>(220);
  const [g, setG] = useState<number>(110);
  const [b, setB] = useState<number>(255);

  const [cyan, setCyan] = useState<number>(75);
  const [magenta, setMagenta] = useState<number>(25);
  const [yellow, setYellow] = useState<number>(10);

  const [wavelengthNm, setWavelengthNm] = useState<number>(532);

  const { saveResult, downloadPdfReport, saving, feedback, canSave } = useSaveLabResult('physics');

  const cmykRgb: [number, number, number] = [
    Math.round(255 * (1 - cyan / 100)),
    Math.round(255 * (1 - magenta / 100)),
    Math.round(255 * (1 - yellow / 100)),
  ];

  const specRgb = useMemo(() => wavelengthToRgb(wavelengthNm), [wavelengthNm]);

  const activeRgb = mode === 'rgb' ? [r, g, b] : mode === 'cmyk' ? cmykRgb : specRgb;
  const activeHex = rgbToHex(activeRgb[0], activeRgb[1], activeRgb[2]);

  // Photon energy E = hc / lambda (eV)
  const photonEv = (1240 / wavelengthNm).toFixed(2);
  const frequencyThz = (299792 / wavelengthNm).toFixed(1);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Light &amp; Color Mixing + Visible Spectrum Lab
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare RGB additive stage light mixing, CMYK subtractive pigment absorption, and photon wavelengths (380–750 nm).
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl self-start">
          {(
            [
              ['rgb', 'RGB Additive Light'],
              ['cmyk', 'CMY Subtractive Ink'],
              ['spectrum', 'Photon Spectrum'],
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Visual Color Mixing Stage */}
        <div className="xl:col-span-6 rounded-2xl border border-border p-5 flex flex-col items-center justify-center min-h-[290px] bg-slate-950 relative">
          {mode === 'rgb' ? (
            <svg viewBox="0 0 260 220" className="w-full max-w-[280px] h-56">
              <circle cx="130" cy="82" r="62" fill={`rgb(${r},0,0)`} style={{ mixBlendMode: 'screen' }} />
              <circle cx="92" cy="142" r="62" fill={`rgb(0,${g},0)`} style={{ mixBlendMode: 'screen' }} />
              <circle cx="168" cy="142" r="62" fill={`rgb(0,0,${b})`} style={{ mixBlendMode: 'screen' }} />
            </svg>
          ) : mode === 'cmyk' ? (
            <div className="bg-white rounded-2xl p-4 shadow-inner">
              <svg viewBox="0 0 260 200" className="w-60 h-48">
                <circle
                  cx="130"
                  cy="74"
                  r="56"
                  fill={`rgba(0,255,255,${cyan / 100})`}
                  style={{ mixBlendMode: 'multiply' }}
                />
                <circle
                  cx="95"
                  cy="130"
                  r="56"
                  fill={`rgba(255,0,255,${magenta / 100})`}
                  style={{ mixBlendMode: 'multiply' }}
                />
                <circle
                  cx="165"
                  cy="130"
                  r="56"
                  fill={`rgba(255,255,0,${yellow / 100})`}
                  style={{ mixBlendMode: 'multiply' }}
                />
              </svg>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div
                className="h-32 rounded-2xl border border-white/20 flex items-center justify-center shadow-lg"
                style={{ backgroundColor: activeHex }}
              >
                <span className="px-4 py-1.5 rounded-xl bg-black/55 text-white font-mono text-sm font-bold">
                  λ = {wavelengthNm} nm
                </span>
              </div>
              <div
                className="h-6 rounded-full border border-white/20"
                style={{
                  background:
                    'linear-gradient(90deg, #7c3aed 0%, #2563eb 22%, #06b6d4 35%, #22c55e 50%, #eab308 64%, #f97316 78%, #dc2626 100%)',
                }}
              />
            </div>
          )}
        </div>

        {/* Sliders + Telemetry */}
        <div className="xl:col-span-6 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-4">
          {mode === 'rgb' && (
            <div className="space-y-3">
              {[
                { label: 'Red Light (R)', val: r, set: setR, accent: 'accent-red-500' },
                { label: 'Green Light (G)', val: g, set: setG, accent: 'accent-green-500' },
                { label: 'Blue Light (B)', val: b, set: setB, accent: 'accent-blue-500' },
              ].map((ch) => (
                <div key={ch.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{ch.label}</span>
                    <span className="font-mono font-semibold">{ch.val}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={ch.val}
                    onChange={(e) => ch.set(Number(e.target.value))}
                    className={cn('w-full', ch.accent)}
                  />
                </div>
              ))}
            </div>
          )}

          {mode === 'cmyk' && (
            <div className="space-y-3">
              {[
                { label: 'Cyan Ink (%)', val: cyan, set: setCyan, accent: 'accent-cyan-500' },
                { label: 'Magenta Ink (%)', val: magenta, set: setMagenta, accent: 'accent-pink-500' },
                { label: 'Yellow Ink (%)', val: yellow, set: setYellow, accent: 'accent-yellow-400' },
              ].map((ch) => (
                <div key={ch.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{ch.label}</span>
                    <span className="font-mono font-semibold">{ch.val}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={ch.val}
                    onChange={(e) => ch.set(Number(e.target.value))}
                    className={cn('w-full', ch.accent)}
                  />
                </div>
              ))}
            </div>
          )}

          {mode === 'spectrum' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Wavelength (λ)</span>
                  <span className="font-mono font-semibold">{wavelengthNm} nm</span>
                </div>
                <input
                  type="range"
                  min={380}
                  max={750}
                  value={wavelengthNm}
                  onChange={(e) => setWavelengthNm(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-[11px] text-muted-foreground">Photon Energy (hf)</p>
                  <p className="font-bold text-foreground mt-0.5">{photonEv} eV</p>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-[11px] text-muted-foreground">Frequency (c/λ)</p>
                  <p className="font-bold text-foreground mt-0.5">{frequencyThz} THz</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl border border-border shrink-0"
                style={{ backgroundColor: activeHex }}
              />
              <div className="text-xs font-mono">
                <p className="font-bold text-foreground">{activeHex}</p>
                <p className="text-muted-foreground">
                  rgb({activeRgb[0]}, {activeRgb[1]}, {activeRgb[2]})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveResult({
                      experimentTitle: `Color & Optics (${mode.toUpperCase()})`,
                      outcome:
                        mode === 'spectrum'
                          ? `Measured ${wavelengthNm} nm (${photonEv} eV) → ${activeHex}`
                          : `Mixed color ${activeHex} via ${mode.toUpperCase()} model`,
                      formula: mode === 'spectrum' ? 'E = hc / λ' : mode === 'rgb' ? 'Additive RGB' : 'Subtractive CMY',
                      measurements: `Hex: ${activeHex}`,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  downloadPdfReport({
                    experimentTitle: `Color & Optics (${mode.toUpperCase()})`,
                    outcome:
                      mode === 'spectrum'
                        ? `Measured photon wavelength λ=${wavelengthNm} nm (${photonEv} eV, ${frequencyThz} THz) corresponding to ${activeHex}.`
                        : `Synthesized target color ${activeHex} (rgb ${activeRgb.join(', ')}) via ${mode.toUpperCase()} model.`,
                    formula: mode === 'spectrum' ? 'E = hc / λ' : mode === 'rgb' ? 'Additive RGB Light Mixing' : 'Subtractive CMY Pigment Mixing',
                    measurements:
                      mode === 'spectrum'
                        ? `λ=${wavelengthNm} nm | Photon Energy=${photonEv} eV | Frequency=${frequencyThz} THz | Hex=${activeHex}`
                        : `Hex=${activeHex} | RGB=(${activeRgb.join(', ')})`,
                    stepsTaken: [
                      `Selected ${mode.toUpperCase()} color optics experiment.`,
                      mode === 'spectrum'
                        ? `Tuned monochromatic wavelength slider to ${wavelengthNm} nm.`
                        : `Balanced spectral channel intensities to rgb(${activeRgb.join(', ')}).`,
                      `Recorded optical color output ${activeHex}.`,
                    ],
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500 whitespace-nowrap"
              >
                <FileDown size={14} />
                <span>PDF Report</span>
              </button>
            </div>
          </div>
          {feedback && <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>}
        </div>
      </div>
    </div>
  );
}
