import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CheckCircle2,
  Eye,
  FileDown,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react';
import { createThreeViewport, disposeObject3D } from '../threeHelpers';
import { useSaveLabResult } from '../useSaveLabResult';
import { cn } from '../../../lib/utils';

// Module-scope scratch math objects (zero GC in animation loop)
const _cellDummy = new THREE.Object3D();
const _cellTarget = new THREE.Vector3();

function createNuclearPoreTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, '#6d28d9');
    grad.addColorStop(0.5, '#7c3aed');
    grad.addColorStop(1, '#5b21b6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Chromatin fiber wisps
    ctx.strokeStyle = 'rgba(221, 214, 254, 0.25)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      const sx = (i * 37) % 256;
      const sy = (i * 23) % 128;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo((sx + 28) % 256, (sy + 18) % 128, (sx + 52) % 256, (sy - 12 + 128) % 128);
      ctx.stroke();
    }

    // Nuclear pore complexes
    for (let i = 0; i < 65; i++) {
      const px = ((i * 53 + 17) % 244) + 6;
      const py = ((i * 31 + 11) % 116) + 6;
      ctx.fillStyle = '#2e1065';
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createLipidBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 128; x += 8) {
        const shade = ((x * 7 + y * 13) % 45) + 110;
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.beginPath();
        ctx.arc(x + 4, y + 4, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

type CellKind = 'animal' | 'plant' | 'bacterial';

interface OrganelleInfo {
  id: string;
  name: string;
  role: string;
  details: string;
  color: string;
  hex: number;
  systemTag: string;
  presentIn: CellKind[];
}

const ORGANELLES: OrganelleInfo[] = [
  {
    id: 'nucleus',
    name: 'Nucleus & Nucleolus',
    role: 'Genetic control center storing chromosomal DNA & ribosomal RNA synthesis',
    details:
      'Surrounded by a perforated double nuclear envelope. Houses chromatin DNA and the dense nucleolus that assembles ribosome subunits.',
    color: '#8b5cf6',
    hex: 0x8b5cf6,
    systemTag: 'Genetic Control',
    presentIn: ['animal', 'plant'],
  },
  {
    id: 'mitochondria',
    name: 'Mitochondria',
    role: 'Generates cellular ATP through aerobic cellular respiration',
    details:
      'Double-membrane powerhouse with folded inner cristae where the electron transport chain and ATP synthase produce ~34 ATP per glucose.',
    color: '#ef4444',
    hex: 0xef4444,
    systemTag: 'Bioenergetics',
    presentIn: ['animal', 'plant'],
  },
  {
    id: 'er',
    name: 'Endoplasmic Reticulum',
    role: 'Synthesizes proteins (Rough ER) and lipids/steroids (Smooth ER)',
    details:
      'Continuous network of folded cisternae extending from the nuclear envelope. Studded with ribosomes on rough domains.',
    color: '#38bdf8',
    hex: 0x38bdf8,
    systemTag: 'Biosynthesis',
    presentIn: ['animal', 'plant'],
  },
  {
    id: 'golgi',
    name: 'Golgi Apparatus',
    role: 'Modifies, sorts, and packages proteins into secretory vesicles',
    details:
      'Stacked flattened membrane sacs (cis to trans face) acting as the cellular distribution center.',
    color: '#f59e0b',
    hex: 0xf59e0b,
    systemTag: 'Trafficking',
    presentIn: ['animal', 'plant'],
  },
  {
    id: 'lysosome',
    name: 'Lysosome / Peroxisome',
    role: 'Digests worn-out organelles, pathogens, and cellular debris',
    details:
      'Acidic membrane-bound vesicles filled with hydrolytic enzymes operating optimally at pH ~4.8.',
    color: '#ec4899',
    hex: 0xec4899,
    systemTag: 'Recycling',
    presentIn: ['animal'],
  },
  {
    id: 'centrosome',
    name: 'Centrosome & Centrioles',
    role: 'Organizes microtubules and mitotic spindle poles during division',
    details:
      'Paired barrel-shaped microtubule triplets arranged at 90 degrees that coordinate chromosome segregation.',
    color: '#eab308',
    hex: 0xeab308,
    systemTag: 'Cytoskeleton',
    presentIn: ['animal'],
  },
  {
    id: 'chloroplast',
    name: 'Chloroplast',
    role: 'Converts sunlight, CO2, and water into glucose via photosynthesis',
    details:
      'Contains chlorophyll-rich thylakoid grana stacks and stroma enzymes performing light reactions and the Calvin cycle.',
    color: '#22c55e',
    hex: 0x22c55e,
    systemTag: 'Photosynthesis',
    presentIn: ['plant'],
  },
  {
    id: 'vacuole',
    name: 'Central Vacuole',
    role: 'Maintains turgor pressure and stores water, ions, and solutes',
    details:
      'Occupies up to 80% of mature plant cell volume, pushing cytoplasm against the rigid cell wall.',
    color: '#06b6d4',
    hex: 0x06b6d4,
    systemTag: 'Turgor & Storage',
    presentIn: ['plant'],
  },
  {
    id: 'cell_wall',
    name: 'Cell Wall',
    role: 'Rigid structural envelope preventing osmotic bursting',
    details:
      'Composed of cross-linked cellulose microfibrils in plants or peptidoglycan mesh in bacteria.',
    color: '#10b981',
    hex: 0x10b981,
    systemTag: 'Structural Envelope',
    presentIn: ['plant', 'bacterial'],
  },
  {
    id: 'nucleoid',
    name: 'Nucleoid Region',
    role: 'Circular double-stranded DNA chromosome suspended freely in cytoplasm',
    details:
      'Prokaryotes lack a nuclear membrane; transcription and translation occur simultaneously in the cytosol.',
    color: '#a855f7',
    hex: 0xa855f7,
    systemTag: 'Prokaryote Genome',
    presentIn: ['bacterial'],
  },
  {
    id: 'plasmid',
    name: 'Plasmid Ring',
    role: 'Small extrachromosomal DNA loop conferring antibiotic resistance',
    details:
      'Replicates independently and can be transferred horizontally between bacteria via conjugation.',
    color: '#f97316',
    hex: 0xf97316,
    systemTag: 'Horizontal Gene Loop',
    presentIn: ['bacterial'],
  },
  {
    id: 'ribosomes',
    name: 'Ribosomes',
    role: 'Translates mRNA codons into polypeptide chains',
    details:
      'Non-membrane ribonucleoprotein complexes (80S in eukaryotes, 70S in prokaryotes) catalyzing peptide bonds.',
    color: '#e2e8f0',
    hex: 0xe2e8f0,
    systemTag: 'Protein Synthesis',
    presentIn: ['animal', 'plant', 'bacterial'],
  },
  {
    id: 'flagellum',
    name: 'Flagellum',
    role: 'Rotary helical propeller enabling chemotaxis motility',
    details:
      'Driven by a transmembrane proton motive force spinning at hundreds of revolutions per second.',
    color: '#14b8a6',
    hex: 0x14b8a6,
    systemTag: 'Motility',
    presentIn: ['bacterial'],
  },
];

const CELL_TITLES: Record<CellKind, { label: string; subtitle: string }> = {
  animal: { label: 'Animal Cell (Eukaryote)', subtitle: 'Flexible phospholipid membrane, mitochondria, centrosomes & lysosomes' },
  plant: { label: 'Plant Cell (Eukaryote)', subtitle: 'Cellulose cell wall, chloroplasts & large central vacuole' },
  bacterial: { label: 'Bacterial Cell (Prokaryote)', subtitle: 'Peptidoglycan capsule, circular nucleoid, plasmids & flagellum' },
};

export default function Cell3DLab() {
  const [cellKind, setCellKind] = useState<CellKind>('animal');
  const [selectedId, setSelectedId] = useState<string>('nucleus');
  const [cutaway, setCutaway] = useState<boolean>(true);
  const [explode, setExplode] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(true);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const captureSnapshotRef = useRef<(() => string | null) | null>(null);
  const stateRef = useRef({ cutaway, explode, playing, selectedId });
  stateRef.current = { cutaway, explode, playing, selectedId };

  const {
    saveResult,
    downloadPdfReport,
    recordStep,
    recordedSteps,
    saving,
    feedback,
    canSave,
  } = useSaveLabResult('biology');

  const visibleOrganelles = useMemo(
    () => ORGANELLES.filter((o) => o.presentIn.includes(cellKind)),
    [cellKind]
  );

  const selectedOrganelle = useMemo(
    () => visibleOrganelles.find((o) => o.id === selectedId) ?? visibleOrganelles[0],
    [visibleOrganelles, selectedId]
  );

  useEffect(() => {
    recordStep(`Loaded ${CELL_TITLES[cellKind].label} 3D interactive model.`);
  }, [cellKind, recordStep]);

  useEffect(() => {
    if (!visibleOrganelles.some((o) => o.id === selectedId)) {
      setSelectedId(visibleOrganelles[0].id);
    }
  }, [visibleOrganelles, selectedId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const ctx = createThreeViewport(mount, {
      background: 0x060b16,
      cameraPos: [0, 2.8, 6.8],
      minDistance: 2.5,
      maxDistance: 16,
      onContextLost: (lost) => setWebglUnavailable(lost),
    });

    if (!ctx) {
      setWebglUnavailable(true);
      return;
    }

    setWebglUnavailable(false);
    const { scene, camera, renderer, controls, afterDraw, captureSnapshot, dispose } = ctx;
    captureSnapshotRef.current = captureSnapshot;

    const cellGroup = new THREE.Group();
    scene.add(cellGroup);
    const nuclearTex = createNuclearPoreTexture();
    const membraneBump = createLipidBumpTexture();

    const clickableMeshes: THREE.Object3D[] = [];
    const organelleGroups = new Map<string, { group: THREE.Group; basePos: THREE.Vector3; explodeDir: THREE.Vector3 }>();
    let shellMesh: THREE.Mesh | null = null;
    let wallMesh: THREE.Mesh | null = null;

    const registerOrganelle = (
      id: string,
      group: THREE.Group,
      basePos: THREE.Vector3,
      explodeDir: THREE.Vector3
    ) => {
      group.position.copy(basePos);
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.organelleId = id;
          clickableMeshes.push(child);
        }
      });
      cellGroup.add(group);
      organelleGroups.set(id, { group, basePos, explodeDir });
    };

    const makeMat = (hex: number, opts?: { roughness?: number; metalness?: number; opacity?: number }) =>
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: opts?.roughness ?? 0.35,
        metalness: opts?.metalness ?? 0.08,
        transparent: (opts?.opacity ?? 1) < 1,
        opacity: opts?.opacity ?? 1,
      });

    // Outer Cell Membrane / Wall with hydrated bilayer PBR sheen
    if (cellKind === 'animal') {
      const geo = new THREE.SphereGeometry(2.3, 44, 32);
      geo.scale(1.08, 0.92, 1.0);
      shellMesh = new THREE.Mesh(
        geo,
        new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          roughness: 0.16,
          metalness: 0.0,
          clearcoat: 0.85,
          clearcoatRoughness: 0.14,
          iridescence: 0.32,
          bumpMap: membraneBump,
          bumpScale: 0.015,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      cellGroup.add(shellMesh);
    } else if (cellKind === 'plant') {
      const wallGeo = new THREE.BoxGeometry(4.2, 3.3, 3.6);
      wallMesh = new THREE.Mesh(
        wallGeo,
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          roughness: 0.6,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      wallMesh.userData.organelleId = 'cell_wall';
      clickableMeshes.push(wallMesh);
      cellGroup.add(wallMesh);

      const edges = new THREE.EdgesGeometry(wallGeo);
      const wire = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.7 })
      );
      cellGroup.add(wire);

      shellMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.85, 2.95, 3.25),
        new THREE.MeshPhysicalMaterial({
          color: 0x6ee7b7,
          roughness: 0.25,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        })
      );
      cellGroup.add(shellMesh);
    } else {
      // Bacterial capsule
      const capGeo = new THREE.CapsuleGeometry(1.15, 2.4, 16, 28);
      capGeo.rotateZ(Math.PI / 2);
      wallMesh = new THREE.Mesh(
        capGeo,
        new THREE.MeshPhysicalMaterial({
          color: 0x10b981,
          roughness: 0.35,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      wallMesh.userData.organelleId = 'cell_wall';
      clickableMeshes.push(wallMesh);
      cellGroup.add(wallMesh);
    }

    let cristaeCores: THREE.Mesh[] = [];
    let flagellumGroupRef: THREE.Group | null = null;

    // Eukaryotic Organelles
    if (cellKind === 'animal' || cellKind === 'plant') {
      // Nucleus with perforated nuclear envelope texture & glowing nucleolus
      const nucGroup = new THREE.Group();
      const nucSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.72, 32, 24),
        new THREE.MeshPhysicalMaterial({
          map: nuclearTex,
          roughness: 0.32,
          clearcoat: 0.45,
          transparent: true,
          opacity: 0.86,
        })
      );
      const nucleolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 22, 18),
        new THREE.MeshStandardMaterial({
          color: 0x5b21b6,
          emissive: 0x7c3aed,
          emissiveIntensity: 0.35,
          roughness: 0.35,
        })
      );
      nucGroup.add(nucSphere, nucleolus);
      registerOrganelle(
        'nucleus',
        nucGroup,
        cellKind === 'plant' ? new THREE.Vector3(-0.95, 0.45, 0) : new THREE.Vector3(0, 0.1, 0),
        new THREE.Vector3(0, 1.3, 0)
      );

      // Rough ER arcs around nucleus
      const erGroup = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const torus = new THREE.Mesh(
          new THREE.TorusGeometry(0.92 + i * 0.14, 0.055, 12, 32, Math.PI * 0.85),
          makeMat(0x38bdf8, { roughness: 0.28 })
        );
        torus.rotation.set(0.4 * i, 0.3 * i, -0.5);
        erGroup.add(torus);
      }
      registerOrganelle(
        'er',
        erGroup,
        cellKind === 'plant' ? new THREE.Vector3(-0.85, 0.3, 0.2) : new THREE.Vector3(0.25, 0.05, 0.1),
        new THREE.Vector3(1.1, 0.7, 0.8)
      );

      // Mitochondria: translucent outer envelope + folded inner cristae core
      const mitoGroup = new THREE.Group();
      [
        [1.15, -0.45, 0.5, 0.4],
        [-1.15, -0.55, -0.5, -0.6],
      ].forEach(([x, y, z, rz]) => {
        const unit = new THREE.Group();
        unit.position.set(x, y, z);
        unit.rotation.set(0.3, 0.2, rz);
        const outer = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.21, 0.46, 12, 20),
          new THREE.MeshPhysicalMaterial({
            color: 0xef4444,
            roughness: 0.24,
            clearcoat: 0.65,
            transparent: true,
            opacity: 0.68,
          })
        );
        const cristae = new THREE.Mesh(
          new THREE.TorusKnotGeometry(0.11, 0.032, 48, 8, 2, 3),
          new THREE.MeshStandardMaterial({
            color: 0xfca5a5,
            emissive: 0xf97316,
            emissiveIntensity: 0.45,
            roughness: 0.3,
          })
        );
        cristae.scale.set(1.0, 2.0, 0.9);
        cristaeCores.push(cristae);
        unit.add(outer, cristae);
        mitoGroup.add(unit);
      });
      registerOrganelle('mitochondria', mitoGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.3, -0.8, 0.6));

      // Golgi Apparatus
      const golgiGroup = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const sac = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.08, 0.55 - i * 0.06, 8, 14),
          makeMat(0xf59e0b)
        );
        sac.rotation.z = Math.PI / 2;
        sac.position.y = i * 0.16;
        golgiGroup.add(sac);
      }
      registerOrganelle(
        'golgi',
        golgiGroup,
        new THREE.Vector3(-0.9, -0.5, 0.85),
        new THREE.Vector3(-1.3, -0.7, 1.1)
      );

      // Ribosomes cluster
      const riboGroup = new THREE.Group();
      const riboMat = makeMat(0xe2e8f0);
      for (let i = 0; i < 14; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), riboMat);
        const angle = (i / 14) * Math.PI * 2;
        dot.position.set(Math.cos(angle) * 1.4, Math.sin(i * 1.7) * 0.7, Math.sin(angle) * 1.1);
        riboGroup.add(dot);
      }
      registerOrganelle('ribosomes', riboGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, 1.1, 1.1));
    }

    if (cellKind === 'animal') {
      // Lysosomes
      const lysoGroup = new THREE.Group();
      [
        [-0.75, 0.85, 0.65],
        [0.85, 0.75, -0.7],
      ].forEach(([x, y, z]) => {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), makeMat(0xec4899));
        l.position.set(x, y, z);
        lysoGroup.add(l);
      });
      registerOrganelle('lysosome', lysoGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1.1, 1.0, 0.8));

      // Centrosome (orthogonal cylinders)
      const centGroup = new THREE.Group();
      const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 12), makeMat(0xeab308));
      const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 12), makeMat(0xeab308));
      c2.rotation.z = Math.PI / 2;
      c2.position.x = 0.18;
      centGroup.add(c1, c2);
      registerOrganelle('centrosome', centGroup, new THREE.Vector3(0.75, 0.9, 0.35), new THREE.Vector3(1.2, 1.2, 0.5));
    }

    if (cellKind === 'plant') {
      // Central Vacuole
      const vacGroup = new THREE.Group();
      const vac = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 28, 20),
        makeMat(0x06b6d4, { opacity: 0.72, roughness: 0.15 })
      );
      vac.scale.set(1.25, 0.95, 1.0);
      vacGroup.add(vac);
      registerOrganelle('vacuole', vacGroup, new THREE.Vector3(0.65, -0.15, -0.15), new THREE.Vector3(1.2, 0.2, -0.8));

      // Chloroplasts with stacked thylakoid grana discs inside translucent stroma
      const chloroGroup = new THREE.Group();
      const stromaMat = new THREE.MeshPhysicalMaterial({
        color: 0x22c55e,
        roughness: 0.22,
        clearcoat: 0.6,
        transparent: true,
        opacity: 0.66,
      });
      const granaMat = makeMat(0x14532d, { roughness: 0.35 });
      [
        [-1.35, -0.8, 0.6],
        [1.25, 0.85, 0.5],
        [-0.2, -1.05, -0.85],
      ].forEach(([x, y, z]) => {
        const unit = new THREE.Group();
        unit.position.set(x, y, z);
        unit.rotation.set(0.4, 0.7, 0.3);
        const ch = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.44, 10, 16), stromaMat);
        unit.add(ch);
        for (let g = -1; g <= 1; g++) {
          const granum = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), granaMat);
          granum.position.y = g * 0.14;
          unit.add(granum);
        }
        chloroGroup.add(unit);
      });
      registerOrganelle('chloroplast', chloroGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1.2, -1.0, 0.7));
    }

    if (cellKind === 'bacterial') {
      // Tangled Nucleoid knot
      const nucGroup = new THREE.Group();
      const knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.45, 0.08, 72, 12, 2, 3),
        makeMat(0xa855f7)
      );
      nucGroup.add(knot);
      registerOrganelle('nucleoid', nucGroup, new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(0, 1.1, 0.6));

      // Plasmid ring
      const plasGroup = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 10, 28), makeMat(0xf97316));
      plasGroup.add(ring);
      registerOrganelle('plasmid', plasGroup, new THREE.Vector3(1.15, 0.2, 0.3), new THREE.Vector3(1.0, 0.9, 0.7));

      // 70S Ribosomes
      const riboGroup = new THREE.Group();
      const riboMat = makeMat(0xe2e8f0);
      for (let i = 0; i < 12; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), riboMat);
        dot.position.set(-1.3 + (i % 6) * 0.5, ((i % 3) - 1) * 0.38, Math.sin(i) * 0.45);
        riboGroup.add(dot);
      }
      registerOrganelle('ribosomes', riboGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1.0, 0.8));

      // Flagellum helical tail (rotary motor propeller)
      const flagGroup = new THREE.Group();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const t = i / 36;
        pts.push(new THREE.Vector3(-2.3 - t * 2.5, Math.sin(t * Math.PI * 4.5) * 0.28, Math.cos(t * Math.PI * 4.5) * 0.28));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const flagMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.052, 8, false), makeMat(0x14b8a6));
      flagGroup.add(flagMesh);
      flagellumGroupRef = flagGroup;
      registerOrganelle('flagellum', flagGroup, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1.3, 0, 0));
    }

    // 24 Streaming Cytoplasmic Vesicles & ATP Carriers (InstancedMesh, zero GC)
    const VESICLE_COUNT = 24;
    const vesicleGeo = new THREE.SphereGeometry(0.042, 10, 8);
    const vesicleMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const vesicleCloud = new THREE.InstancedMesh(vesicleGeo, vesicleMat, VESICLE_COUNT);
    vesicleCloud.frustumCulled = false;
    cellGroup.add(vesicleCloud);

    // Click Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length > 0) {
        const orgId = hits[0].object.userData.organelleId as string | undefined;
        if (orgId) {
          setSelectedId(orgId);
          const match = ORGANELLES.find((o) => o.id === orgId);
          if (match) {
            recordStep(`Inspected ${match.name} in 3D ${CELL_TITLES[cellKind].label}.`);
          }
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    const clock = new THREE.Clock();
    let mounted = true;
    let elapsed = 0;

    const tick = () => {
      if (!mounted) return;
      const dt = Math.min(clock.getDelta(), 0.08);
      const { cutaway: cw, explode: ex, playing: pl, selectedId: sel } = stateRef.current;

      if (pl) {
        elapsed += dt;
        cellGroup.rotation.y += dt * 0.22;

        // Mitochondria cristae ATP energy pulse
        for (let i = 0; i < cristaeCores.length; i++) {
          const mat = cristaeCores[i].material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(elapsed * 3.4 + i * 1.4));
        }

        // Bacterial flagellum corkscrew rotation
        if (flagellumGroupRef) {
          flagellumGroupRef.rotation.x = elapsed * 5.2;
        }
      }

      // Cytoplasmic vesicle / ATP transport cyclosis stream
      const rxBase = cellKind === 'bacterial' ? 1.55 : 1.75;
      const ryBase = cellKind === 'bacterial' ? 0.62 : 1.05;
      for (let i = 0; i < VESICLE_COUNT; i++) {
        const phase = (i / VESICLE_COUNT) * Math.PI * 2 + elapsed * (0.42 + (i % 3) * 0.12);
        const radial = 0.55 + ((i * 7) % 10) * 0.042;
        _cellDummy.position.set(
          Math.cos(phase) * rxBase * radial,
          Math.sin(phase * 1.3 + i) * ryBase * 0.58,
          Math.sin(phase) * 1.2 * radial
        );
        const pulse = 0.8 + 0.3 * Math.sin(elapsed * 3 + i);
        _cellDummy.scale.setScalar(pulse);
        _cellDummy.updateMatrix();
        vesicleCloud.setMatrixAt(i, _cellDummy.matrix);
      }
      vesicleCloud.instanceMatrix.needsUpdate = true;

      if (shellMesh) {
        const m = shellMesh.material as THREE.MeshPhysicalMaterial;
        m.opacity = cw ? 0.16 : 0.42;
      }
      if (wallMesh) {
        const m = wallMesh.material as THREE.MeshStandardMaterial;
        m.opacity = cw ? 0.18 : 0.45;
      }

      const dampAlpha = 1 - Math.exp(-8 * dt);
      organelleGroups.forEach(({ group, basePos, explodeDir }, id) => {
        _cellTarget.copy(basePos).addScaledVector(explodeDir, ex);
        group.position.lerp(_cellTarget, dampAlpha);
        const isSel = id === sel;
        group.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && mesh.material instanceof THREE.MeshStandardMaterial) {
            if (!cristaeCores.includes(mesh)) {
              mesh.material.emissive.setHex(isSel ? mesh.material.color.getHex() : 0x000000);
              mesh.material.emissiveIntensity = isSel ? 0.42 : 0;
            }
          }
        });
      });

      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    afterDraw(tick);

    return () => {
      mounted = false;
      captureSnapshotRef.current = null;
      renderer.domElement.removeEventListener('click', handleClick);
      nuclearTex.dispose();
      membraneBump.dispose();
      disposeObject3D(cellGroup);
      dispose();
    };
  }, [cellKind]);

  return (
    <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            3D Interactive Cell Explorer
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {CELL_TITLES[cellKind].subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-muted p-1 rounded-xl self-start">
          {(['animal', 'plant', 'bacterial'] as CellKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setCellKind(kind)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                cellKind === kind
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {kind === 'animal' ? 'Animal Cell' : kind === 'plant' ? 'Plant Cell' : 'Bacterial Cell'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left: Interactive 3D Viewport */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          <div className="relative h-[420px] sm:h-[480px] rounded-2xl overflow-hidden border border-border bg-[#060b16]">
            {webglUnavailable ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-2">
                <p className="text-sm font-semibold">WebGL 3D context paused</p>
                <p className="text-xs text-slate-400">
                  Select organelles from the list on the right to inspect their cellular functions.
                </p>
              </div>
            ) : (
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}

            {/* Lightweight non-blurred HUD controls */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-950/90 border border-white/15 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-100 hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {playing ? <Pause size={13} /> : <Play size={13} />}
                  <span>{playing ? 'Pause' : 'Rotate'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCutaway((c) => !c)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors',
                    cutaway
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : 'text-slate-200 hover:bg-white/10'
                  )}
                >
                  <Eye size={13} />
                  <span>Cutaway</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExplode((e) => (e > 0.1 ? 0 : 0.9))}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors',
                    explode > 0.1
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'text-slate-200 hover:bg-white/10'
                  )}
                >
                  <Layers size={13} />
                  <span>{explode > 0.1 ? 'Assemble' : 'Explode'}</span>
                </button>
              </div>

              <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                <span>Spread</span>
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  value={explode}
                  onChange={(e) => setExplode(parseFloat(e.target.value))}
                  className="w-20 accent-sky-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    setExplode(0);
                    setCutaway(true);
                  }}
                  title="Reset View"
                  className="p-1 text-slate-300 hover:text-white"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Organelle Inspector Banner */}
          {selectedOrganelle && (
            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedOrganelle.color }}
                  />
                  <h3 className="text-base font-bold text-foreground">
                    {selectedOrganelle.name}
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    [{selectedOrganelle.systemTag}]
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground/90">{selectedOrganelle.role}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedOrganelle.details}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                {canSave && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveResult({
                        experimentTitle: `${CELL_TITLES[cellKind].label} Inspection`,
                        outcome: `Inspected ${selectedOrganelle.name}: ${selectedOrganelle.role}`,
                        measurements: `${visibleOrganelles.length} organelles mapped · Cutaway ${cutaway ? 'On' : 'Off'} · Explode ${Math.round(explode * 100)}%`,
                        notes: selectedOrganelle.details,
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Save size={14} />
                    <span>{saving ? 'Saving...' : 'Save Lab'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    downloadPdfReport({
                      experimentTitle: `${CELL_TITLES[cellKind].label} Inspection`,
                      outcome: `Inspected ${selectedOrganelle.name}: ${selectedOrganelle.role}`,
                      measurements: `${visibleOrganelles.length} organelles mapped · Cutaway ${cutaway ? 'On' : 'Off'} · Explode ${Math.round(explode * 100)}%`,
                      notes: selectedOrganelle.details,
                      stepsTaken:
                        recordedSteps.length > 0
                          ? recordedSteps
                          : [
                              `Opened ${CELL_TITLES[cellKind].label} 3D viewport.`,
                              `Examined ${selectedOrganelle.name} (${selectedOrganelle.systemTag}).`,
                            ],
                      snapshotDataUrl: captureSnapshotRef.current?.() || undefined,
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500 whitespace-nowrap"
                >
                  <FileDown size={14} />
                  <span>PDF Report</span>
                </button>
              </div>
            </div>
          )}
          {feedback && (
            <p
              className={cn(
                'text-xs font-medium px-3 py-2 rounded-xl border',
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              )}
            >
              {feedback.text}
            </p>
          )}
        </div>

        {/* Right: Organelle Directory & Comparison Matrix */}
        <div className="xl:col-span-4 flex flex-col gap-3">
          <div className="p-4 rounded-2xl bg-muted/30 border border-border flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={15} className="text-primary" />
                Organelles in {cellKind === 'bacterial' ? 'Prokaryote' : cellKind === 'plant' ? 'Plant' : 'Animal'} Cell
              </h3>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {visibleOrganelles.length} parts
              </span>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[380px] pr-1">
              {visibleOrganelles.map((org) => {
                const active = selectedOrganelle?.id === org.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(org.id);
                      recordStep(`Selected ${org.name} (${org.systemTag}) in organelle directory.`);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3',
                      active
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-card border-border hover:border-primary/40 text-foreground'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: org.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold truncate">{org.name}</span>
                        {active && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {org.role}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
