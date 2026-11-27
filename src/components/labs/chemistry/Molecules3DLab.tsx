import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Atom, Eye, Pause, Play, Plus, RotateCcw, Save, Sparkles, Trash2 } from 'lucide-react';
import { createThreeViewport, disposeObject3D } from '../threeHelpers';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

type ElementSymbol = 'H' | 'C' | 'N' | 'O' | 'F' | 'Cl' | 'S' | 'P' | 'Na';

const ELEMENT_PROPS: Record<
  ElementSymbol,
  { name: string; hex: number; css: string; radius: number; mass: number }
> = {
  H: { name: 'Hydrogen', hex: 0xf8fafc, css: '#f8fafc', radius: 0.28, mass: 1.008 },
  C: { name: 'Carbon', hex: 0x334155, css: '#334155', radius: 0.44, mass: 12.011 },
  N: { name: 'Nitrogen', hex: 0x2563eb, css: '#2563eb', radius: 0.41, mass: 14.007 },
  O: { name: 'Oxygen', hex: 0xdc2626, css: '#dc2626', radius: 0.40, mass: 15.999 },
  F: { name: 'Fluorine', hex: 0x84cc16, css: '#84cc16', radius: 0.36, mass: 18.998 },
  Cl: { name: 'Chlorine', hex: 0x16a34a, css: '#16a34a', radius: 0.48, mass: 35.45 },
  S: { name: 'Sulfur', hex: 0xeab308, css: '#eab308', radius: 0.50, mass: 32.06 },
  P: { name: 'Phosphorus', hex: 0xf97316, css: '#f97316', radius: 0.49, mass: 30.974 },
  Na: { name: 'Sodium', hex: 0x8b5cf6, css: '#8b5cf6', radius: 0.52, mass: 22.99 },
};

interface AtomNode {
  el: ElementSymbol;
  pos: [number, number, number];
}

interface BondEdge {
  a: number;
  b: number;
  order: 1 | 2 | 3;
}

interface MoleculePreset {
  id: string;
  formula: string;
  name: string;
  geometry: string;
  bondAngle: string;
  hybridization: string;
  polarity: 'Polar' | 'Non-polar' | 'Ionic';
  description: string;
  atoms: AtomNode[];
  bonds: BondEdge[];
}

const MOLECULES: MoleculePreset[] = [
  {
    id: 'h2o',
    formula: 'H₂O',
    name: 'Water',
    geometry: 'Bent (V-Shaped)',
    bondAngle: '104.5°',
    hybridization: 'sp³',
    polarity: 'Polar',
    description: 'Two lone pairs on Oxygen compress the H–O–H bond angle below 109.5°, creating a strong dipole.',
    atoms: [
      { el: 'O', pos: [0, 0.25, 0] },
      { el: 'H', pos: [-0.95, -0.45, 0] },
      { el: 'H', pos: [0.95, -0.45, 0] },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
    ],
  },
  {
    id: 'co2',
    formula: 'CO₂',
    name: 'Carbon Dioxide',
    geometry: 'Linear',
    bondAngle: '180°',
    hybridization: 'sp',
    polarity: 'Non-polar',
    description: 'Two symmetric C=O double bonds cancel out opposing bond dipoles along the molecular axis.',
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'O', pos: [-1.45, 0, 0] },
      { el: 'O', pos: [1.45, 0, 0] },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
    ],
  },
  {
    id: 'ch4',
    formula: 'CH₄',
    name: 'Methane',
    geometry: 'Tetrahedral',
    bondAngle: '109.5°',
    hybridization: 'sp³',
    polarity: 'Non-polar',
    description: 'Four equivalent C–H covalent bonds point toward the vertices of a regular tetrahedron.',
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'H', pos: [0, 1.15, 0] },
      { el: 'H', pos: [1.08, -0.38, 0] },
      { el: 'H', pos: [-0.54, -0.38, 0.94] },
      { el: 'H', pos: [-0.54, -0.38, -0.94] },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
    ],
  },
  {
    id: 'nh3',
    formula: 'NH₃',
    name: 'Ammonia',
    geometry: 'Trigonal Pyramidal',
    bondAngle: '107.0°',
    hybridization: 'sp³',
    polarity: 'Polar',
    description: 'One unshared lone pair at the apex repels the three N–H bonding pairs downward.',
    atoms: [
      { el: 'N', pos: [0, 0.35, 0] },
      { el: 'H', pos: [1.0, -0.35, 0] },
      { el: 'H', pos: [-0.5, -0.35, 0.87] },
      { el: 'H', pos: [-0.5, -0.35, -0.87] },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
    ],
  },
  {
    id: 'sf6',
    formula: 'SF₆',
    name: 'Sulfur Hexafluoride',
    geometry: 'Octahedral',
    bondAngle: '90°',
    hybridization: 'sp³d²',
    polarity: 'Non-polar',
    description: 'Hypervalent central Sulfur surrounded symmetrically by six Fluorine ligands along orthogonal axes.',
    atoms: [
      { el: 'S', pos: [0, 0, 0] },
      { el: 'F', pos: [1.4, 0, 0] },
      { el: 'F', pos: [-1.4, 0, 0] },
      { el: 'F', pos: [0, 1.4, 0] },
      { el: 'F', pos: [0, -1.4, 0] },
      { el: 'F', pos: [0, 0, 1.4] },
      { el: 'F', pos: [0, 0, -1.4] },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
    ],
  },
  {
    id: 'c2h5oh',
    formula: 'C₂H₅OH',
    name: 'Ethanol',
    geometry: 'Tetrahedral Chain + Bent Hydroxyl',
    bondAngle: '109.5° / 104.5°',
    hybridization: 'sp³',
    polarity: 'Polar',
    description: 'Two-carbon aliphatic chain terminating in a hydrogen-bonding hydroxyl (–OH) functional group.',
    atoms: [
      { el: 'C', pos: [-1.1, 0, 0] },
      { el: 'C', pos: [0.35, 0.2, 0] },
      { el: 'O', pos: [1.15, -0.9, 0] },
      { el: 'H', pos: [2.0, -0.65, 0] },
      { el: 'H', pos: [-1.5, 0.9, 0.4] },
      { el: 'H', pos: [-1.5, -0.8, 0.45] },
      { el: 'H', pos: [-1.4, 0.0, -0.95] },
      { el: 'H', pos: [0.55, 0.8, 0.85] },
      { el: 'H', pos: [0.55, 0.8, -0.85] },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 1, b: 8, order: 1 },
    ],
  },
  {
    id: 'c6h6',
    formula: 'C₆H₆',
    name: 'Benzene Ring',
    geometry: 'Planar Aromatic Hexagon',
    bondAngle: '120°',
    hybridization: 'sp²',
    polarity: 'Non-polar',
    description: 'Delocalized π-electron cloud shared evenly across 6 ring carbons with alternating conjugated bonds.',
    atoms: [
      ...[0, 1, 2, 3, 4, 5].map((i) => ({
        el: 'C' as ElementSymbol,
        pos: [Math.cos((i * Math.PI) / 3) * 1.25, 0, Math.sin((i * Math.PI) / 3) * 1.25] as [
          number,
          number,
          number,
        ],
      })),
      ...[0, 1, 2, 3, 4, 5].map((i) => ({
        el: 'H' as ElementSymbol,
        pos: [Math.cos((i * Math.PI) / 3) * 2.18, 0, Math.sin((i * Math.PI) / 3) * 2.18] as [
          number,
          number,
          number,
        ],
      })),
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 2 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 0, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 2, b: 8, order: 1 },
      { a: 3, b: 9, order: 1 },
      { a: 4, b: 10, order: 1 },
      { a: 5, b: 11, order: 1 },
    ],
  },
  {
    id: 'h2so4',
    formula: 'H₂SO₄',
    name: 'Sulfuric Acid',
    geometry: 'Tetrahedral Center',
    bondAngle: '109.5°',
    hybridization: 'sp³',
    polarity: 'Polar',
    description: 'Diprotic strong mineral acid featuring two S=O double bonds and two ionizable O–H groups.',
    atoms: [
      { el: 'S', pos: [0, 0, 0] },
      { el: 'O', pos: [0, 1.15, 0.7] },
      { el: 'O', pos: [0, 1.15, -0.7] },
      { el: 'O', pos: [-1.15, -0.75, 0] },
      { el: 'O', pos: [1.15, -0.75, 0] },
      { el: 'H', pos: [-1.95, -0.35, 0] },
      { el: 'H', pos: [1.95, -0.35, 0] },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 3, b: 5, order: 1 },
      { a: 4, b: 6, order: 1 },
    ],
  },
  {
    id: 'c2h2',
    formula: 'C₂H₂',
    name: 'Acetylene (Ethyne)',
    geometry: 'Linear Triple Bond',
    bondAngle: '180°',
    hybridization: 'sp',
    polarity: 'Non-polar',
    description: 'Linear alkyne joined by one σ and two π bonds between sp-hybridized carbons.',
    atoms: [
      { el: 'C', pos: [-0.62, 0, 0] },
      { el: 'C', pos: [0.62, 0, 0] },
      { el: 'H', pos: [-1.62, 0, 0] },
      { el: 'H', pos: [1.62, 0, 0] },
    ],
    bonds: [
      { a: 0, b: 1, order: 3 },
      { a: 0, b: 2, order: 1 },
      { a: 1, b: 3, order: 1 },
    ],
  },
];

export default function Molecules3DLab() {
  const [selectedId, setSelectedId] = useState<string>('h2o');
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customAtoms, setCustomAtoms] = useState<AtomNode[]>([
    { el: 'C', pos: [0, 0, 0] },
    { el: 'O', pos: [1.3, 0.2, 0] },
  ]);
  const [customBonds, setCustomBonds] = useState<BondEdge[]>([{ a: 0, b: 1, order: 2 }]);
  const [addElement, setAddElement] = useState<ElementSymbol>('H');
  const [bondOrder, setBondOrder] = useState<1 | 2 | 3>(1);
  const [attachToIndex, setAttachToIndex] = useState<number>(0);

  const [displayStyle, setDisplayStyle] = useState<'ball-stick' | 'space-fill'>('ball-stick');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [webglError, setWebglError] = useState<boolean>(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const { saveResult, saving, feedback, canSave } = useSaveLabResult('chemistry');

  const activePreset = useMemo(
    () => MOLECULES.find((m) => m.id === selectedId) ?? MOLECULES[0],
    [selectedId]
  );

  const activeAtoms = customMode ? customAtoms : activePreset.atoms;
  const activeBonds = customMode ? customBonds : activePreset.bonds;

  const molarMass = useMemo(() => {
    const sum = activeAtoms.reduce((acc, a) => acc + ELEMENT_PROPS[a.el].mass, 0);
    return sum.toFixed(2);
  }, [activeAtoms]);

  const customFormula = useMemo(() => {
    if (!customMode) return activePreset.formula;
    const counts: Partial<Record<ElementSymbol, number>> = {};
    customAtoms.forEach((a) => {
      counts[a.el] = (counts[a.el] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([el, count]) => `${el}${(count ?? 0) > 1 ? count : ''}`)
      .join('');
  }, [customMode, customAtoms, activePreset]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const ctx = createThreeViewport(mount, {
      background: 0x060b16,
      cameraPos: [0, 1.5, 5.2],
      minDistance: 2.0,
      maxDistance: 14,
      onContextLost: (lost) => setWebglError(lost),
    });

    if (!ctx) {
      setWebglError(true);
      return;
    }
    setWebglError(false);

    const { scene, camera, renderer, controls, afterDraw, dispose } = ctx;
    const molGroup = new THREE.Group();
    scene.add(molGroup);

    // Center molecule around origin
    const center = new THREE.Vector3();
    if (activeAtoms.length > 0) {
      activeAtoms.forEach((a) => center.add(new THREE.Vector3(...a.pos)));
      center.divideScalar(activeAtoms.length);
    }

    // Build Atoms
    activeAtoms.forEach((atom) => {
      const spec = ELEMENT_PROPS[atom.el];
      const radius = displayStyle === 'space-fill' ? spec.radius * 2.15 : spec.radius;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 28, 22),
        new THREE.MeshStandardMaterial({
          color: spec.hex,
          roughness: 0.25,
          metalness: 0.12,
        })
      );
      mesh.position.set(atom.pos[0] - center.x, atom.pos[1] - center.y, atom.pos[2] - center.z);
      molGroup.add(mesh);
    });

    // Build Covalent Bonds
    if (displayStyle === 'ball-stick') {
      const up = new THREE.Vector3(0, 1, 0);
      const bondMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.35,
        metalness: 0.35,
      });

      activeBonds.forEach((bond) => {
        const nodeA = activeAtoms[bond.a];
        const nodeB = activeAtoms[bond.b];
        if (!nodeA || !nodeB) return;

        const pA = new THREE.Vector3(...nodeA.pos).sub(center);
        const pB = new THREE.Vector3(...nodeB.pos).sub(center);
        const dir = new THREE.Vector3().subVectors(pB, pA);
        const dist = dir.length();
        if (dist < 0.01) return;

        const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());

        // Orthogonal offset axis for double / triple bonds
        const perp = new THREE.Vector3(0, 0, 1);
        if (Math.abs(dir.clone().normalize().dot(perp)) > 0.9) {
          perp.set(1, 0, 0);
        }
        perp.crossVectors(dir, perp).normalize();

        const offsets =
          bond.order === 1 ? [0] : bond.order === 2 ? [-0.075, 0.075] : [-0.1, 0, 0.1];
        const stickRadius = bond.order === 1 ? 0.08 : 0.055;

        offsets.forEach((off) => {
          const stick = new THREE.Mesh(
            new THREE.CylinderGeometry(stickRadius, stickRadius, dist, 12),
            bondMat
          );
          stick.quaternion.copy(quat);
          stick.position.copy(mid).addScaledVector(perp, off);
          molGroup.add(stick);
        });
      });
    }

    const clock = new THREE.Clock();
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      if (autoRotateRef.current) {
        molGroup.rotation.y += dt * 0.45;
      }
      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };
    afterDraw(tick);

    return () => {
      mounted = false;
      disposeObject3D(molGroup);
      dispose();
    };
  }, [activeAtoms, activeBonds, displayStyle]);

  const handleAddCustomAtom = () => {
    if (customAtoms.length >= 16) return;
    const parentIdx = Math.min(attachToIndex, customAtoms.length - 1);
    const parent = customAtoms[parentIdx];
    const angle = customAtoms.length * 1.35;
    const elev = ((customAtoms.length % 3) - 1) * 0.65;
    const nextPos: [number, number, number] = [
      Number((parent.pos[0] + Math.cos(angle) * 1.25).toFixed(2)),
      Number((parent.pos[1] + elev).toFixed(2)),
      Number((parent.pos[2] + Math.sin(angle) * 1.25).toFixed(2)),
    ];
    const newIndex = customAtoms.length;
    setCustomAtoms((prev) => [...prev, { el: addElement, pos: nextPos }]);
    setCustomBonds((prev) => [...prev, { a: parentIdx, b: newIndex, order: bondOrder }]);
    setAttachToIndex(newIndex);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            3D Molecules &amp; VSEPR Bonding Lab
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inspect 3D covalent geometries, hybridization, bond orders, or construct your own molecule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                !customMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Molecule Library
            </button>
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap',
                customMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Custom Builder
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDisplayStyle((s) => (s === 'ball-stick' ? 'space-fill' : 'ball-stick'))}
            className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
          >
            <Eye size={14} />
            <span>{displayStyle === 'ball-stick' ? 'Space-Filling' : 'Ball & Stick'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left: Molecule Selector or Custom Builder */}
        <div className="xl:col-span-4 space-y-3">
          {!customMode ? (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 max-h-[470px] overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Select Molecule ({MOLECULES.length})
              </p>
              {MOLECULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between',
                    selectedId === m.id
                      ? 'bg-primary/10 border-primary text-foreground'
                      : 'bg-card border-border hover:border-primary/40 text-foreground'
                  )}
                >
                  <div>
                    <span className="font-bold text-sm font-mono">{m.formula}</span>
                    <span className="text-xs text-muted-foreground ml-2">{m.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">{m.bondAngle}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Atom size={16} className="text-primary" />
                  Build Custom Molecule
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCustomAtoms([{ el: 'C', pos: [0, 0, 0] }]);
                    setCustomBonds([]);
                    setAttachToIndex(0);
                  }}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">1. Pick Element</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(ELEMENT_PROPS) as ElementSymbol[]).map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setAddElement(sym)}
                      className={cn(
                        'py-2 rounded-lg border text-xs font-bold font-mono transition-colors',
                        addElement === sym
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-foreground hover:border-primary/40'
                      )}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">2. Attach To</label>
                  <select
                    value={attachToIndex}
                    onChange={(e) => setAttachToIndex(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs font-mono"
                  >
                    {customAtoms.map((a, idx) => (
                      <option key={idx} value={idx}>
                        #{idx + 1} {a.el}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">3. Bond Order</label>
                  <select
                    value={bondOrder}
                    onChange={(e) => setBondOrder(Number(e.target.value) as 1 | 2 | 3)}
                    className="w-full px-2.5 py-2 rounded-lg bg-card border border-border text-xs"
                  >
                    <option value={1}>Single (—)</option>
                    <option value={2}>Double (=)</option>
                    <option value={3}>Triple (≡)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={customAtoms.length >= 16}
                onClick={handleAddCustomAtom}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                <Plus size={15} />
                <span>Bond {addElement} to #{attachToIndex + 1}</span>
              </button>

              <p className="text-[11px] text-muted-foreground">
                Formula: <strong className="font-mono text-foreground">{customFormula}</strong> ·{' '}
                {customAtoms.length}/16 atoms · {molarMass} g/mol
              </p>
            </div>
          )}
        </div>

        {/* Right: 3D Viewport + Telemetry */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          <div className="relative h-[390px] sm:h-[430px] rounded-2xl overflow-hidden border border-border bg-[#060b16]">
            {webglError ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-xs">
                WebGL preview paused — select another molecule to re-render.
              </div>
            ) : (
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}

            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-white/15 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setAutoRotate((r) => !r)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-100 hover:bg-white/10 flex items-center gap-1.5"
                >
                  {autoRotate ? <Pause size={13} /> : <Play size={13} />}
                  <span>{autoRotate ? 'Pause Spin' : 'Auto Spin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayStyle((s) => (s === 'ball-stick' ? 'space-fill' : 'ball-stick'))}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>{displayStyle === 'ball-stick' ? 'Ball & Stick' : 'Space-Fill'}</span>
                </button>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950/90 border border-white/15 text-[11px] font-mono text-slate-300">
                CPK Standard · Drag to Orbit · Scroll to Zoom
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold font-mono text-foreground">{customFormula}</span>
                {!customMode && (
                  <>
                    <span className="text-xs font-semibold text-foreground">{activePreset.name}</span>
                    <span className="text-xs font-mono text-primary">{activePreset.geometry}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Angle: {activePreset.bondAngle} · {activePreset.hybridization} · {activePreset.polarity}
                    </span>
                  </>
                )}
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {molarMass} g/mol
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {customMode
                  ? `Custom structure with ${customAtoms.length} bonded atoms and ${customBonds.length} covalent linkages.`
                  : activePreset.description}
              </p>
            </div>
            {canSave && (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  saveResult({
                    experimentTitle: customMode
                      ? `Custom Molecule ${customFormula}`
                      : `${activePreset.name} (${activePreset.formula}) 3D Analysis`,
                    outcome: customMode
                      ? `Built custom 3D molecule ${customFormula} (${molarMass} g/mol)`
                      : `${activePreset.geometry}, bond angle ${activePreset.bondAngle}, ${activePreset.polarity}`,
                    formula: customFormula,
                    measurements: `Molar mass: ${molarMass} g/mol | Atoms: ${activeAtoms.length}`,
                  })
                }
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Molecule'}</span>
              </button>
            )}
          </div>
          {feedback && (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {feedback.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
