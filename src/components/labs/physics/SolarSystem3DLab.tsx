import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { FileDown, Globe, Pause, Play, RotateCcw, Save } from 'lucide-react';
import { createThreeViewport, disposeObject3D } from '../threeHelpers';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

function createPlanetTexture(id: string, baseCss: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseCss;
    ctx.fillRect(0, 0, 256, 128);

    if (id === 'sun') {
      const grad = ctx.createLinearGradient(0, 0, 256, 128);
      grad.addColorStop(0, '#f97316');
      grad.addColorStop(0.5, '#facc15');
      grad.addColorStop(1, '#ea580c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.35)' : 'rgba(194, 65, 12, 0.35)';
        ctx.beginPath();
        ctx.arc((i * 41) % 256, (i * 29) % 128, 3 + (i % 6), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'earth') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(0, 0, 256, 128);
      // Continents
      ctx.fillStyle = '#15803d';
      [
        [45, 50, 28, 20],
        [120, 42, 34, 26],
        [185, 72, 22, 18],
        [75, 88, 18, 16],
      ].forEach(([cx, cy, rx, ry]) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      // Clouds & polar caps
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.fillRect(0, 0, 256, 10);
      ctx.fillRect(0, 118, 256, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.ellipse((i * 37) % 256, 20 + ((i * 19) % 88), 20, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'jupiter' || id === 'saturn') {
      const bands = id === 'jupiter'
        ? ['#9a3412', '#fdba74', '#b45309', '#fed7aa', '#7c2d12', '#e5b887']
        : ['#ca8a04', '#fef08a', '#d97706', '#fde68a', '#b45309'];
      for (let y = 0; y < 128; y += 8) {
        ctx.fillStyle = bands[(y / 8) % bands.length];
        ctx.fillRect(0, y, 256, 8);
      }
      if (id === 'jupiter') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(150, 78, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.arc((i * 47) % 256, (i * 31) % 128, 3 + (i % 5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface PlanetSpec {
  id: string;
  name: string;
  color: number;
  cssColor: string;
  radius: number;
  orbitRadius: number;
  speed: number;
  distanceAU: string;
  gravity: string;
  orbitalPeriod: string;
  moons: number;
  temp: string;
  facts: string;
  hasRings?: boolean;
}

const PLANETS: PlanetSpec[] = [
  {
    id: 'sun',
    name: 'Sun',
    color: 0xf59e0b,
    cssColor: '#f59e0b',
    radius: 1.5,
    orbitRadius: 0,
    speed: 0,
    distanceAU: '0.00 AU',
    gravity: '274 m/s²',
    orbitalPeriod: '230M yrs (Galactic)',
    moons: 0,
    temp: '5,778 K surface',
    facts: 'G-type main-sequence star fusing ~600 million tons of hydrogen into helium every second.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    color: 0x94a3b8,
    cssColor: '#94a3b8',
    radius: 0.24,
    orbitRadius: 2.5,
    speed: 1.8,
    distanceAU: '0.39 AU',
    gravity: '3.7 m/s²',
    orbitalPeriod: '88 days',
    moons: 0,
    temp: '-180°C to 430°C',
    facts: 'Smallest innermost planet with virtually no atmosphere and extreme day-night thermal swings.',
  },
  {
    id: 'venus',
    name: 'Venus',
    color: 0xeab308,
    cssColor: '#eab308',
    radius: 0.36,
    orbitRadius: 3.6,
    speed: 1.3,
    distanceAU: '0.72 AU',
    gravity: '8.87 m/s²',
    orbitalPeriod: '225 days',
    moons: 0,
    temp: '465°C',
    facts: 'Runaway CO₂ greenhouse atmosphere makes Venus hotter than Mercury; rotates retrograde.',
  },
  {
    id: 'earth',
    name: 'Earth',
    color: 0x3b82f6,
    cssColor: '#3b82f6',
    radius: 0.38,
    orbitRadius: 4.9,
    speed: 1.0,
    distanceAU: '1.00 AU',
    gravity: '9.81 m/s²',
    orbitalPeriod: '365.25 days',
    moons: 1,
    temp: '15°C avg',
    facts: 'Liquid surface oceans, protective magnetosphere, and nitrogen-oxygen biosphere.',
  },
  {
    id: 'mars',
    name: 'Mars',
    color: 0xef4444,
    cssColor: '#ef4444',
    radius: 0.29,
    orbitRadius: 6.3,
    speed: 0.78,
    distanceAU: '1.52 AU',
    gravity: '3.72 m/s²',
    orbitalPeriod: '687 days',
    moons: 2,
    temp: '-63°C avg',
    facts: 'Home to Olympus Mons, polar CO₂ ice caps, and ancient dried river deltas.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    color: 0xd97706,
    cssColor: '#d97706',
    radius: 0.85,
    orbitRadius: 8.8,
    speed: 0.45,
    distanceAU: '5.20 AU',
    gravity: '24.79 m/s²',
    orbitalPeriod: '11.86 yrs',
    moons: 95,
    temp: '-110°C',
    facts: 'Largest gas giant; Great Red Spot is a centuries-old anticyclonic storm larger than Earth.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    color: 0xfde047,
    cssColor: '#fde047',
    radius: 0.72,
    orbitRadius: 11.8,
    speed: 0.34,
    distanceAU: '9.58 AU',
    gravity: '10.44 m/s²',
    orbitalPeriod: '29.45 yrs',
    moons: 146,
    temp: '-140°C',
    hasRings: true,
    facts: 'Extensive icy ring system spanning 282,000 km wide yet averaging under 30 meters thick.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    color: 0x22d3ee,
    cssColor: '#22d3ee',
    radius: 0.50,
    orbitRadius: 14.6,
    speed: 0.24,
    distanceAU: '19.22 AU',
    gravity: '8.69 m/s²',
    orbitalPeriod: '84 yrs',
    moons: 28,
    temp: '-195°C',
    facts: 'Ice giant tilted 97.8° onto its side, causing extreme 42-year polar seasons.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    color: 0x2563eb,
    cssColor: '#2563eb',
    radius: 0.48,
    orbitRadius: 17.2,
    speed: 0.18,
    distanceAU: '30.05 AU',
    gravity: '11.15 m/s²',
    orbitalPeriod: '164.8 yrs',
    moons: 16,
    temp: '-200°C',
    facts: 'Supersonic methane winds exceeding 2,100 km/h whip across deep azure cloud bands.',
  },
];

export default function SolarSystem3DLab() {
  const [selectedId, setSelectedId] = useState<string>('earth');
  const [playing, setPlaying] = useState<boolean>(true);
  const [speedMult, setSpeedMult] = useState<number>(1.0);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [webglError, setWebglError] = useState<boolean>(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const captureSnapshotRef = useRef<(() => string | null) | null>(null);
  const stateRef = useRef({ playing, speedMult, showOrbits, selectedId });
  stateRef.current = { playing, speedMult, showOrbits, selectedId };

  const {
    saveResult,
    downloadPdfReport,
    recordStep,
    recordedSteps,
    saving,
    feedback,
    canSave,
  } = useSaveLabResult('physics');

  const selectedPlanet = useMemo(
    () => PLANETS.find((p) => p.id === selectedId) ?? PLANETS[3],
    [selectedId]
  );

  useEffect(() => {
    recordStep(`Observed ${selectedPlanet.name} (${selectedPlanet.distanceAU}, gravity ${selectedPlanet.gravity}).`);
  }, [selectedPlanet.id, selectedPlanet.name, selectedPlanet.distanceAU, selectedPlanet.gravity, recordStep]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const ctx = createThreeViewport(mount, {
      background: 0x040711,
      cameraPos: [0, 12, 24],
      minDistance: 4,
      maxDistance: 55,
      onContextLost: (lost) => setWebglError(lost),
    });

    if (!ctx) {
      setWebglError(true);
      return;
    }
    setWebglError(false);

    const { scene, camera, renderer, controls, afterDraw, captureSnapshot, dispose } = ctx;
    captureSnapshotRef.current = captureSnapshot;
    const orrery = new THREE.Group();
    scene.add(orrery);
    const createdTextures: THREE.CanvasTexture[] = [];

    // Background Starfield
    const starPositions = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const r = 48 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.2, transparent: true, opacity: 0.75 })
    );
    orrery.add(stars);

    const sunLight = new THREE.PointLight(0xfff3c4, 4.5, 90, 0.25);
    orrery.add(sunLight);

    const orbitLines: THREE.Line[] = [];
    const clickableMeshes: THREE.Object3D[] = [];
    const bodyNodes: { spec: PlanetSpec; pivot: THREE.Group; mesh: THREE.Mesh; angle: number }[] = [];
    let moonPivot: THREE.Group | null = null;
    let sunCorona: THREE.Mesh | null = null;

    PLANETS.forEach((spec, idx) => {
      const pivot = new THREE.Group();
      const angle = idx * 0.95;
      orrery.add(pivot);

      const tex = createPlanetTexture(spec.id, spec.cssColor);
      createdTextures.push(tex);

      const mat =
        spec.id === 'sun'
          ? new THREE.MeshBasicMaterial({ map: tex })
          : new THREE.MeshStandardMaterial({
              map: tex,
              roughness: spec.id === 'earth' ? 0.38 : 0.62,
              metalness: 0.08,
            });

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, 32, 24), mat);
      mesh.position.x = spec.orbitRadius;
      mesh.userData.planetId = spec.id;
      clickableMeshes.push(mesh);
      pivot.add(mesh);

      if (spec.id === 'sun') {
        sunCorona = new THREE.Mesh(
          new THREE.SphereGeometry(spec.radius * 1.18, 28, 22),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            transparent: true,
            opacity: 0.22,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        pivot.add(sunCorona);
      }

      if (spec.id === 'earth') {
        moonPivot = new THREE.Group();
        moonPivot.position.x = spec.orbitRadius;
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 16, 12),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 })
        );
        moon.position.x = 0.72;
        moonPivot.add(moon);
        pivot.add(moonPivot);
      }

      if (spec.hasRings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(spec.radius * 1.35, spec.radius * 2.15, 56),
          new THREE.MeshStandardMaterial({
            color: 0xe5c97a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.78,
            roughness: 0.65,
          })
        );
        ring.rotation.x = Math.PI / 2 - 0.38;
        ring.position.x = spec.orbitRadius;
        pivot.add(ring);
      }

      if (spec.orbitRadius > 0) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * spec.orbitRadius, 0, Math.sin(a) * spec.orbitRadius));
        }
        const orbitLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.55 })
        );
        orrery.add(orbitLine);
        orbitLines.push(orbitLine);
      }

      bodyNodes.push({ spec, pivot, mesh, angle });
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const pid = hits[0].object.userData.planetId as string | undefined;
        if (pid) setSelectedId(pid);
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    const clock = new THREE.Clock();
    let mounted = true;
    let sunPulseElapsed = 0;
    const tick = () => {
      if (!mounted) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const { playing: pl, speedMult: sm, showOrbits: so } = stateRef.current;

      orbitLines.forEach((l) => {
        l.visible = so;
      });

      if (pl) {
        sunPulseElapsed += dt;
        bodyNodes.forEach((node) => {
          node.angle += dt * node.spec.speed * sm * 0.6;
          node.pivot.rotation.y = node.angle;
          node.mesh.rotation.y += dt * 0.8;
        });
        if (moonPivot) {
          moonPivot.rotation.y += dt * 2.2 * sm;
        }
        if (sunCorona) {
          const s = 1 + Math.sin(sunPulseElapsed * 2.5) * 0.035;
          sunCorona.scale.setScalar(s);
        }
      }

      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };
    afterDraw(tick);

    return () => {
      mounted = false;
      captureSnapshotRef.current = null;
      renderer.domElement.removeEventListener('click', handleClick);
      createdTextures.forEach((t) => t.dispose());
      disposeObject3D(orrery);
      dispose();
    };
  }, []);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            3D Solar System &amp; Orbital Mechanics
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Explore Keplerian planetary orbits, relative scales, gravity, and celestial telemetry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5"
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
            <span>{playing ? 'Pause Orbit' : 'Resume Orbit'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowOrbits((o) => !o)}
            className={cn(
              'px-3 py-1.5 rounded-xl border text-xs font-medium',
              showOrbits ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'
            )}
          >
            Orbit Paths
          </button>
        </div>
      </div>

      {/* Quick Planet Selector Strip */}
      <div className="flex flex-wrap gap-1.5">
        {PLANETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap',
              selectedId === p.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/40 border-border text-foreground hover:border-primary/40'
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.cssColor }} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 relative h-[410px] sm:h-[460px] rounded-2xl overflow-hidden border border-border bg-[#040711]">
          {webglError ? (
            <div className="h-full flex items-center justify-center text-slate-300 text-xs">
              WebGL preview paused — use the planet selector above to inspect celestial data.
            </div>
          ) : (
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
          )}

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-200">
              <span>Time Warp</span>
              <input
                type="range"
                min={0.2}
                max={4}
                step={0.2}
                value={speedMult}
                onChange={(e) => setSpeedMult(parseFloat(e.target.value))}
                className="w-24 accent-amber-400"
              />
              <span className="font-mono w-9">{speedMult.toFixed(1)}×</span>
              <button
                type="button"
                onClick={() => setSpeedMult(1)}
                className="text-slate-300 hover:text-white"
                title="Reset Speed"
              >
                <RotateCcw size={13} />
              </button>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/15 text-[11px] font-mono text-slate-300">
              Click any planet in 3D or drag to orbit
            </span>
          </div>
        </div>

        {/* Planet Telemetry Inspector */}
        <div className="xl:col-span-4 p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: selectedPlanet.cssColor }}
              />
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Globe size={16} className="text-primary" />
                  {selectedPlanet.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground">
                  {selectedPlanet.distanceAU} from Sun
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <p className="text-[11px] text-muted-foreground">Surface Gravity</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedPlanet.gravity}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <p className="text-[11px] text-muted-foreground">Orbital Period</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedPlanet.orbitalPeriod}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <p className="text-[11px] text-muted-foreground">Known Moons</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedPlanet.moons}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-card border border-border">
                <p className="text-[11px] text-muted-foreground">Temperature</p>
                <p className="font-mono font-semibold text-foreground mt-0.5">{selectedPlanet.temp}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{selectedPlanet.facts}</p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {canSave && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    saveResult({
                      experimentTitle: `${selectedPlanet.name} Planetary Study`,
                      outcome: selectedPlanet.facts,
                      formula: 'T² = (4π² / GM) · a³',
                      measurements: `Distance: ${selectedPlanet.distanceAU} | g: ${selectedPlanet.gravity} | Period: ${selectedPlanet.orbitalPeriod}`,
                    })
                  }
                  className="flex-1 py-2.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  <Save size={14} />
                  <span>{saving ? 'Saving...' : 'Save Lab'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  downloadPdfReport({
                    experimentTitle: `${selectedPlanet.name} Planetary Study`,
                    outcome: selectedPlanet.facts,
                    formula: 'T² = (4π² / GM) · a³',
                    measurements: `Distance: ${selectedPlanet.distanceAU} | Surface Gravity: ${selectedPlanet.gravity} | Period: ${selectedPlanet.orbitalPeriod} | Moons: ${selectedPlanet.moons} | Time Warp: ${speedMult.toFixed(1)}x`,
                    stepsTaken:
                      recordedSteps.length > 0
                        ? recordedSteps
                        : [
                            `Initialized 3D Solar System orbital simulation.`,
                            `Observed ${selectedPlanet.name} orbital motion at ${selectedPlanet.distanceAU}.`,
                          ],
                    snapshotDataUrl: captureSnapshotRef.current?.() || undefined,
                  })
                }
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-500 whitespace-nowrap"
              >
                <FileDown size={14} />
                <span>PDF Report</span>
              </button>
            </div>
            {feedback && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback.text}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
