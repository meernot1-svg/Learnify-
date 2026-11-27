import * as THREE from 'three';
import {
  PartRegistry,
  SpecimenBuildResult,
  addPedestal,
  createLeafVeinTexture,
} from './anatomyBuilder';

function createBarkTexture(darkHex: string, lightHex: string, maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = darkHex;
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 12) {
    ctx.strokeStyle = lightHex;
    ctx.lineWidth = 2 + (x % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 5, 85, x - 5, 170, x + 2, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeShellMat(color: number, opacity = 0.28): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.16,
    metalness: 0.02,
    transmission: 0.22,
    transparent: true,
    opacity,
    depthWrite: false,
    clearcoat: 0.9,
  });
}

function makeTissueMat(color: number, roughness = 0.45, emissive = 0x000000): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.05,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: emissive ? 0.22 : 0,
  });
}

function finalize(
  root: THREE.Group,
  reg: PartRegistry,
  updateAnimation: (elapsed: number, delta: number) => void
): SpecimenBuildResult {
  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation,
  };
}

// ============================================================================
// 8 MICROORGANISMS & CELLS
// ============================================================================

function buildAnimalCell(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.6);

  // 1. Plasma Membrane (cutaway dome + translucent top)
  const memGroup = new THREE.Group();
  memGroup.position.set(0, 1.2, 0);
  const lowerBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 32, 20, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
    new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.25, clearcoat: 0.6, side: THREE.DoubleSide })
  );
  const upperDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42),
    makeShellMat(0x7dd3fc, 0.26)
  );
  const lipidRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.035, 10, 48),
    makeTissueMat(0x0284c7, 0.35)
  );
  lipidRim.rotation.x = Math.PI / 2;
  lipidRim.position.y = 0.23;
  memGroup.add(lowerBowl, upperDome, lipidRim);
  root.add(memGroup);
  reg.shellMeshes.push(upperDome);
  reg.registerPart('membrane', memGroup, new THREE.Vector3(0, 0.65, 0));

  // 2. Nucleus & Nucleolus
  const nucGroup = new THREE.Group();
  nucGroup.position.set(-0.08, 1.28, -0.05);
  const nucEnv = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 20, 0, Math.PI * 1.55),
    makeTissueMat(0x7c3aed, 0.4, 0x3b0764)
  );
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 16),
    makeTissueMat(0xd946ef, 0.25, 0x701a75)
  );
  nucGroup.add(nucEnv, nucleolus);
  root.add(nucGroup);
  reg.registerPart('nucleus', nucGroup, new THREE.Vector3(0, 0.48, -0.35));

  // 3. Rough ER & Golgi Stack
  const erGroup = new THREE.Group();
  erGroup.position.set(-0.42, 1.18, 0.25);
  const erMat = makeTissueMat(0x0ea5e9, 0.4);
  for (let i = 0; i < 4; i++) {
    const fold = new THREE.Mesh(new THREE.TorusGeometry(0.2 + i * 0.055, 0.032, 8, 24, Math.PI * 0.85), erMat);
    fold.rotation.set(Math.PI / 2, 0, i * 0.3);
    fold.position.y = (i - 1.5) * 0.04;
    erGroup.add(fold);
  }
  const golgiMat = makeTissueMat(0x2dd4bf, 0.35);
  for (let g = 0; g < 4; g++) {
    const cisterna = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.22 - g * 0.02, 6, 12), golgiMat);
    cisterna.position.set(0.68, -0.06 + g * 0.055, 0.14);
    cisterna.rotation.z = Math.PI / 2 + 0.18;
    erGroup.add(cisterna);
  }
  root.add(erGroup);
  reg.registerPart('er_golgi', erGroup, new THREE.Vector3(-0.62, 0.25, 0.3));

  // 4. Mitochondria
  const mitoGroup = new THREE.Group();
  mitoGroup.position.set(0.42, 1.18, 0.15);
  const mitoMat = makeTissueMat(0xf97316, 0.35, 0x7c2d12);
  const cristaeMat = makeTissueMat(0xfef08a, 0.4);
  const mitoOffsets: [number, number, number, number][] = [
    [0, 0, 0, 0.4],
    [-0.18, -0.1, -0.45, -0.6],
    [-0.7, -0.12, -0.25, 1.1],
  ];
  mitoOffsets.forEach(([x, y, z, rz]) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 8, 16), mitoMat);
    m.position.set(x, y, z);
    m.rotation.set(0.4, 0.3, rz);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.015, 6, 16), cristaeMat);
    m.add(band);
    mitoGroup.add(m);
  });
  root.add(mitoGroup);
  reg.registerPart('mitochondria', mitoGroup, new THREE.Vector3(0.62, 0.25, 0.2));

  // 5. Centrioles & Lysosomes
  const cenGroup = new THREE.Group();
  cenGroup.position.set(0.18, 1.32, 0.46);
  const cenMat = makeTissueMat(0xfacc15, 0.35);
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 9), cenMat);
  const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 9), cenMat);
  c2.rotation.z = Math.PI / 2;
  c2.position.set(0.08, -0.05, 0);
  const lysoMat = makeTissueMat(0xf43f5e, 0.28, 0x881337);
  [[-0.25, -0.15, -0.1], [-0.45, -0.1, 0.1], [0.24, -0.14, -0.18]].forEach(([x, y, z]) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), lysoMat);
    l.position.set(x, y, z);
    cenGroup.add(l);
  });
  cenGroup.add(c1, c2);
  root.add(cenGroup);
  reg.registerPart('centrioles_lysosomes', cenGroup, new THREE.Vector3(0.25, 0.35, 0.6));

  return finalize(root, reg, (elapsed) => {
    mitoGroup.position.y = 1.18 + Math.sin(elapsed * 2.1) * 0.025;
    nucGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.12;
  });
}

function buildPlantCell(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  // 1. Rigid Cell Wall (hexagonal prism cutaway)
  const wallGroup = new THREE.Group();
  wallGroup.position.set(0, 1.15, 0);
  const outerHex = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.85, 6, 1, false),
    makeShellMat(0x22c55e, 0.26)
  );
  const bottomHex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.98, 0.98, 0.16, 6),
    makeTissueMat(0x15803d, 0.6)
  );
  bottomHex.position.y = -0.34;
  wallGroup.add(outerHex, bottomHex);
  root.add(wallGroup);
  reg.shellMeshes.push(outerHex);
  reg.registerPart('cell_wall', wallGroup, new THREE.Vector3(0, -0.45, 0));

  // 2. Central Vacuole
  const vacGroup = new THREE.Group();
  vacGroup.position.set(0.18, 1.18, -0.08);
  const vac = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 24, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      transmission: 0.45,
      transparent: true,
      opacity: 0.65,
      clearcoat: 1,
    })
  );
  vac.scale.set(1.15, 0.75, 1.0);
  vacGroup.add(vac);
  root.add(vacGroup);
  reg.registerPart('vacuole', vacGroup, new THREE.Vector3(0.4, 0.55, 0));

  // 3. Chloroplasts
  const chlGroup = new THREE.Group();
  chlGroup.position.set(0, 1.18, 0);
  const chlMat = makeTissueMat(0x16a34a, 0.35, 0x052e16);
  const thylakoidMat = makeTissueMat(0x4ade80, 0.3);
  const posList: [number, number, number][] = [
    [-0.65, 0.05, 0.15],
    [-0.55, -0.06, -0.35],
    [0.52, 0.04, 0.42],
    [0.08, -0.05, 0.65],
    [0.62, -0.04, -0.35],
  ];
  posList.forEach(([x, y, z], i) => {
    const ch = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.16, 8, 14), chlMat);
    ch.position.set(x, y, z);
    ch.rotation.set(0.4, i * 0.8, Math.PI / 2);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), thylakoidMat);
    ch.add(disc);
    chlGroup.add(ch);
  });
  root.add(chlGroup);
  reg.registerPart('chloroplasts', chlGroup, new THREE.Vector3(-0.55, 0.35, 0.45));

  // 4. Nucleus
  const nucGroup = new THREE.Group();
  nucGroup.position.set(-0.46, 1.24, 0.22);
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), makeTissueMat(0x8b5cf6, 0.38, 0x3b0764));
  const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), makeTissueMat(0xe879f9, 0.3));
  nucleolus.position.set(0.06, 0.04, 0.08);
  nucGroup.add(nuc, nucleolus);
  root.add(nucGroup);
  reg.registerPart('nucleus', nucGroup, new THREE.Vector3(-0.65, 0.48, -0.25));

  // 5. Mitochondria & Golgi
  const mgGroup = new THREE.Group();
  mgGroup.position.set(0.32, 1.14, 0.55);
  const mitoMat = makeTissueMat(0xf59e0b, 0.35, 0x78350f);
  const m1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 8, 12), mitoMat);
  m1.rotation.z = Math.PI / 2.4;
  const m2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 8, 12), mitoMat);
  m2.position.set(-0.6, 0.08, -0.95);
  m2.rotation.x = 0.8;
  const golgiMat = makeTissueMat(0x14b8a6, 0.4);
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.18, 6, 10), golgiMat);
    bar.position.set(-0.18, i * 0.045, -0.1);
    bar.rotation.z = Math.PI / 2;
    mgGroup.add(bar);
  }
  mgGroup.add(m1, m2);
  root.add(mgGroup);
  reg.registerPart('mitochondria_golgi', mgGroup, new THREE.Vector3(0.45, 0.2, 0.55));

  return finalize(root, reg, (elapsed) => {
    chlGroup.children.forEach((c, idx) => {
      c.position.y += Math.sin(elapsed * 2 + idx) * 0.0008;
    });
    vac.scale.y = 0.75 + Math.sin(elapsed * 1.5) * 0.03;
  });
}

function buildBacteriaEcoli(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  const cellOriginY = 1.25;

  // 1. Capsule & Cell Wall
  const capGroup = new THREE.Group();
  capGroup.position.set(0, cellOriginY, 0);
  const capsuleShell = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.44, 1.05, 16, 28),
    makeShellMat(0x22c55e, 0.34)
  );
  capsuleShell.rotation.z = Math.PI / 2;
  const innerMem = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.39, 0.98, 12, 24),
    makeShellMat(0x86efac, 0.2)
  );
  innerMem.rotation.z = Math.PI / 2;
  capGroup.add(capsuleShell, innerMem);
  root.add(capGroup);
  reg.shellMeshes.push(capsuleShell);
  reg.registerPart('capsule_wall', capGroup, new THREE.Vector3(0, 0.55, 0));

  // 2. Nucleoid DNA Loop & Plasmid
  const nucGroup = new THREE.Group();
  nucGroup.position.set(0, cellOriginY, 0);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    pts.push(
      new THREE.Vector3(
        Math.sin(t) * 0.42 + Math.cos(t * 3) * 0.08,
        Math.cos(t * 2) * 0.16,
        Math.sin(t * 3) * 0.15
      )
    );
  }
  const dnaCurve = new THREE.CatmullRomCurve3(pts, true);
  const dnaMesh = new THREE.Mesh(
    new THREE.TubeGeometry(dnaCurve, 64, 0.026, 8, true),
    makeTissueMat(0xa855f7, 0.35, 0x581c87)
  );
  const plasmid = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.016, 8, 20),
    makeTissueMat(0xe879f9, 0.3, 0x701a75)
  );
  plasmid.position.set(0.55, -0.05, 0.12);
  nucGroup.add(dnaMesh, plasmid);
  root.add(nucGroup);
  reg.registerPart('nucleoid', nucGroup, new THREE.Vector3(0, 0.35, 0.45));

  // 3. Ribosomes & Cytoplasm Granules
  const ribGroup = new THREE.Group();
  ribGroup.position.set(0, cellOriginY, 0);
  const ribMat = makeTissueMat(0xfacc15, 0.3);
  for (let i = 0; i < 24; i++) {
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), ribMat);
    r.position.set(((i % 6) - 2.5) * 0.25, Math.sin(i * 2.1) * 0.22, Math.cos(i * 1.7) * 0.22);
    ribGroup.add(r);
  }
  root.add(ribGroup);
  reg.registerPart('ribosomes', ribGroup, new THREE.Vector3(0, -0.4, 0.35));

  // 4. Pili (Fimbriae bristles)
  const piliGroup = new THREE.Group();
  piliGroup.position.set(0, cellOriginY, 0);
  const piliMat = makeTissueMat(0x4ade80, 0.5);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const xPos = ((i % 7) - 3) * 0.22;
    const pilus = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.24, 6), piliMat);
    const dir = new THREE.Vector3(0, Math.cos(a), Math.sin(a)).normalize();
    pilus.position.set(xPos, dir.y * 0.48, dir.z * 0.48);
    pilus.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    piliGroup.add(pilus);
  }
  root.add(piliGroup);
  reg.registerPart('pili', piliGroup, new THREE.Vector3(0, 0.4, -0.45));

  // 5. Flagella Whip Bundle
  const flagGroup = new THREE.Group();
  flagGroup.position.set(-0.92, cellOriginY, 0);
  const flagMat = makeTissueMat(0xf472b6, 0.35);
  for (let f = 0; f < 4; f++) {
    const fPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 20; s++) {
      const x = -s * 0.055;
      const ph = s * 0.45 + f * 1.5;
      fPts.push(new THREE.Vector3(x, Math.sin(ph) * 0.14 + (f - 1.5) * 0.06, Math.cos(ph) * 0.14));
    }
    const whip = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fPts), 28, 0.014, 6, false),
      flagMat
    );
    flagGroup.add(whip);
  }
  root.add(flagGroup);
  reg.registerPart('flagella', flagGroup, new THREE.Vector3(-0.75, 0, 0));

  return finalize(root, reg, (elapsed) => {
    flagGroup.rotation.x = elapsed * 4.5;
    nucGroup.rotation.x = Math.sin(elapsed * 0.8) * 0.1;
  });
}

function buildParamecium(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.6);

  // 1. Pellicle & Cilia Coat
  const pelGroup = new THREE.Group();
  pelGroup.position.set(0, 1.22, 0);
  const bodyMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.15, 16, 28),
    makeShellMat(0x67e8f9, 0.3)
  );
  bodyMesh.rotation.z = Math.PI / 2.2;
  bodyMesh.scale.set(0.85, 1, 0.72);
  pelGroup.add(bodyMesh);
  const ciliaMat = makeTissueMat(0x22d3ee, 0.4);
  for (let i = 0; i < 36; i++) {
    const t = (i / 36) * Math.PI * 2;
    const x = Math.cos(t) * 0.88;
    const y = Math.sin(t) * 0.36;
    const cil = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.01, 0.14, 5), ciliaMat);
    cil.position.set(x, y, (i % 2 === 0 ? 1 : -1) * 0.16);
    cil.rotation.z = t - Math.PI / 2;
    pelGroup.add(cil);
  }
  root.add(pelGroup);
  reg.shellMeshes.push(bodyMesh);
  reg.registerPart('pellicle_cilia', pelGroup, new THREE.Vector3(0, 0.55, 0));

  // 2. Oral Groove & Gullet
  const oralGroup = new THREE.Group();
  oralGroup.position.set(0.18, 1.15, 0.25);
  const groove = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.45, 0.18, 0.05),
        new THREE.Vector3(0.1, 0.04, 0.02),
        new THREE.Vector3(-0.15, -0.04, -0.14),
      ]),
      20,
      0.07,
      10,
      false
    ),
    makeTissueMat(0x0ea5e9, 0.35)
  );
  oralGroup.add(groove);
  root.add(oralGroup);
  reg.registerPart('oral_groove', oralGroup, new THREE.Vector3(0.45, 0.15, 0.55));

  // 3. Macro- and Micronucleus
  const nucGroup = new THREE.Group();
  nucGroup.position.set(-0.08, 1.24, -0.02);
  const macro = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 10, 18), makeTissueMat(0xa855f7, 0.35, 0x581c87));
  macro.rotation.z = Math.PI / 2;
  const micro = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), makeTissueMat(0xe879f9, 0.3));
  micro.position.set(0.12, -0.14, 0.06);
  nucGroup.add(macro, micro);
  root.add(nucGroup);
  reg.registerPart('nuclei', nucGroup, new THREE.Vector3(0, 0.5, -0.4));

  // 4. Contractile Vacuoles (starburst pumps at each end)
  const conGroup = new THREE.Group();
  conGroup.position.set(0, 1.24, 0);
  const vacMat = makeTissueMat(0xfacc15, 0.25, 0x854d0e);
  [-0.58, 0.55].forEach((xOff) => {
    const star = new THREE.Group();
    star.position.set(xOff, xOff * 0.1, 0);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), vacMat);
    star.add(hub);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const canal = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 8), vacMat);
      canal.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0);
      canal.rotation.z = a - Math.PI / 2;
      star.add(canal);
    }
    conGroup.add(star);
  });
  root.add(conGroup);
  reg.registerPart('contractile', conGroup, new THREE.Vector3(-0.6, 0.3, 0.2));

  // 5. Endoplasm & Food Vacuoles
  const endGroup = new THREE.Group();
  endGroup.position.set(0, 1.2, 0);
  const fMat = makeTissueMat(0x4ade80, 0.4);
  [[-0.25, -0.1, 0.1], [0.05, 0.08, -0.14], [0.28, -0.12, 0.05], [-0.42, 0.05, -0.05]].forEach(([x, y, z]) => {
    const fv = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), fMat);
    fv.position.set(x, y, z);
    endGroup.add(fv);
  });
  root.add(endGroup);
  reg.registerPart('endoplasm', endGroup, new THREE.Vector3(0.45, -0.35, 0));

  return finalize(root, reg, (elapsed) => {
    conGroup.children.forEach((star, i) => {
      const s = 0.85 + Math.sin(elapsed * 3.2 + i * Math.PI) * 0.22;
      star.scale.setScalar(s);
    });
    pelGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.04;
  });
}

function buildAmoeba(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.6);

  // 1. Pseudopods (lobed extensions)
  const pseGroup = new THREE.Group();
  pseGroup.position.set(0, 1.15, 0);
  const lobeMat = makeShellMat(0x60a5fa, 0.34);
  const lobeDirs: [number, number, number, number][] = [
    [0.65, 0.05, 0.2, 0.24],
    [-0.55, 0.12, 0.48, 0.2],
    [-0.45, -0.04, -0.58, 0.22],
    [0.42, -0.05, -0.52, 0.19],
    [0.12, 0.18, 0.65, 0.18],
  ];
  lobeDirs.forEach(([x, y, z, r]) => {
    const lobe = new THREE.Mesh(new THREE.CapsuleGeometry(r, 0.45, 10, 18), lobeMat);
    lobe.position.set(x * 0.6, y, z * 0.6);
    lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize());
    pseGroup.add(lobe);
  });
  root.add(pseGroup);
  reg.shellMeshes.push(...(pseGroup.children as THREE.Mesh[]));
  reg.registerPart('pseudopods', pseGroup, new THREE.Vector3(0.65, 0.15, 0.3));

  // 2. Plasma Membrane Core
  const memGroup = new THREE.Group();
  memGroup.position.set(0, 1.15, 0);
  const coreBlob = new THREE.Mesh(new THREE.SphereGeometry(0.58, 28, 22), makeShellMat(0x93c5fd, 0.26));
  coreBlob.scale.set(1.18, 0.56, 1.05);
  memGroup.add(coreBlob);
  root.add(memGroup);
  reg.shellMeshes.push(coreBlob);
  reg.registerPart('membrane', memGroup, new THREE.Vector3(0, 0.55, 0));

  // 3. Nucleus
  const nucGroup = new THREE.Group();
  nucGroup.position.set(-0.08, 1.18, -0.05);
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), makeTissueMat(0xa855f7, 0.35, 0x581c87));
  nuc.scale.y = 0.72;
  nucGroup.add(nuc);
  root.add(nucGroup);
  reg.registerPart('nucleus', nucGroup, new THREE.Vector3(-0.35, 0.52, 0));

  // 4. Contractile Vacuole
  const cvGroup = new THREE.Group();
  cvGroup.position.set(0.28, 1.16, 0.22);
  const cv = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), makeTissueMat(0x38bdf8, 0.18, 0x0369a1));
  cvGroup.add(cv);
  root.add(cvGroup);
  reg.registerPart('contractile_vacuole', cvGroup, new THREE.Vector3(0.5, 0.45, 0.35));

  // 5. Food Vacuoles
  const fvGroup = new THREE.Group();
  fvGroup.position.set(0, 1.15, 0);
  const fvMat = makeTissueMat(0x4ade80, 0.35);
  [[-0.3, -0.03, 0.18], [0.18, 0.04, -0.25], [-0.15, 0.02, -0.32], [0.42, -0.02, -0.04]].forEach(([x, y, z]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), fvMat);
    f.position.set(x, y, z);
    fvGroup.add(f);
  });
  root.add(fvGroup);
  reg.registerPart('food_vacuoles', fvGroup, new THREE.Vector3(-0.45, -0.3, -0.35));

  return finalize(root, reg, (elapsed) => {
    pseGroup.children.forEach((l, i) => {
      const s = 1 + Math.sin(elapsed * 1.6 + i * 1.2) * 0.12;
      l.scale.set(1, s, 1);
    });
    cv.scale.setScalar(0.82 + Math.sin(elapsed * 2.8) * 0.22);
  });
}

function buildEuglena(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.6);

  // 1. Flagellum
  const flagGroup = new THREE.Group();
  flagGroup.position.set(0.88, 1.25, 0);
  const fCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.24, 0.14, 0.08),
    new THREE.Vector3(0.52, -0.1, -0.08),
    new THREE.Vector3(0.76, 0.1, 0.06),
  ]);
  const flagMesh = new THREE.Mesh(new THREE.TubeGeometry(fCurve, 28, 0.018, 8, false), makeTissueMat(0x38bdf8, 0.3));
  flagGroup.add(flagMesh);
  root.add(flagGroup);
  reg.registerPart('flagellum', flagGroup, new THREE.Vector3(0.75, 0, 0));

  // 2. Stigma Eyespot & Photoreceptor
  const eyeGroup = new THREE.Group();
  eyeGroup.position.set(0.62, 1.32, 0.12);
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 12), makeTissueMat(0xef4444, 0.25, 0x7f1d1d));
  eyeGroup.add(spot);
  root.add(eyeGroup);
  reg.registerPart('eyespot', eyeGroup, new THREE.Vector3(0.45, 0.45, 0.35));

  // 3. Chloroplasts (ribbon discs)
  const chlGroup = new THREE.Group();
  chlGroup.position.set(0, 1.25, 0);
  const chlMat = makeTissueMat(0x22c55e, 0.35, 0x052e16);
  for (let i = 0; i < 6; i++) {
    const disc = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.18, 6, 12), chlMat);
    const a = (i / 6) * Math.PI * 2;
    disc.position.set(-0.2 + (i % 3) * 0.22, Math.sin(a) * 0.12, Math.cos(a) * 0.12);
    disc.rotation.z = Math.PI / 2;
    chlGroup.add(disc);
  }
  root.add(chlGroup);
  reg.registerPart('chloroplasts', chlGroup, new THREE.Vector3(0, 0.4, 0.45));

  // 4. Spiral Pellicle Spindle Body
  const pelGroup = new THREE.Group();
  pelGroup.position.set(0, 1.25, 0);
  const spindle = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.12, 14, 24), makeShellMat(0x4ade80, 0.3));
  spindle.rotation.z = Math.PI / 2;
  pelGroup.add(spindle);
  root.add(pelGroup);
  reg.shellMeshes.push(spindle);
  reg.registerPart('pellicle', pelGroup, new THREE.Vector3(0, -0.45, 0));

  // 5. Nucleus & Reservoir Vacuole
  const nvGroup = new THREE.Group();
  nvGroup.position.set(-0.22, 1.25, 0);
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 14), makeTissueMat(0xa855f7, 0.35));
  const res = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), makeTissueMat(0xfacc15, 0.25));
  res.position.set(0.62, 0.01, 0);
  nvGroup.add(nuc, res);
  root.add(nvGroup);
  reg.registerPart('nucleus_vacuole', nvGroup, new THREE.Vector3(-0.55, 0.35, -0.35));

  return finalize(root, reg, (elapsed) => {
    flagGroup.rotation.x = Math.sin(elapsed * 5.2) * 0.32;
    flagGroup.rotation.y = Math.cos(elapsed * 5.2) * 0.2;
  });
}

function buildBacteriophage(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  // 1. Icosahedral Capsid Head
  const capGroup = new THREE.Group();
  capGroup.position.set(0, 2.08, 0);
  const capsid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.25,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  capsid.scale.set(1, 1.18, 1);
  capGroup.add(capsid);
  root.add(capGroup);
  reg.shellMeshes.push(capsid);
  reg.registerPart('capsid', capGroup, new THREE.Vector3(0, 0.72, 0));

  // 2. DNA Genome Coil Inside Head
  const dnaGroup = new THREE.Group();
  dnaGroup.position.set(0, 2.08, 0);
  const dPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 50; i++) {
    const t = (i / 50) * Math.PI * 8;
    const rad = Math.sin((i / 50) * Math.PI) * 0.2;
    dPts.push(new THREE.Vector3(Math.cos(t) * rad, (i / 50 - 0.5) * 0.48, Math.sin(t) * rad));
  }
  const dnaCoil = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dPts), 60, 0.022, 8, false),
    makeTissueMat(0xf43f5e, 0.3, 0x881337)
  );
  dnaGroup.add(dnaCoil);
  root.add(dnaGroup);
  reg.registerPart('dna_core', dnaGroup, new THREE.Vector3(0, 0.55, 0.45));

  // 3. Collar & Contractile Tail Sheath
  const colGroup = new THREE.Group();
  colGroup.position.set(0, 1.22, 0);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), makeTissueMat(0xe2e8f0, 0.35));
  collar.position.y = 0.36;
  const sheathCore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 14), makeTissueMat(0x8b5cf6, 0.35));
  colGroup.add(collar, sheathCore);
  for (let r = 0; r < 8; r++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 8, 18), makeTissueMat(0xa78bfa, 0.3));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.28 + r * 0.08;
    colGroup.add(ring);
  }
  root.add(colGroup);
  reg.registerPart('collar_sheath', colGroup, new THREE.Vector3(0, 0.15, 0));

  // 4. Hexagonal Baseplate & Pins
  const baseGroup = new THREE.Group();
  baseGroup.position.set(0, 0.82, 0);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.07, 6), makeTissueMat(0xf59e0b, 0.35));
  baseGroup.add(plate);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.1, 8), makeTissueMat(0xfef08a, 0.3));
    pin.position.set(Math.cos(a) * 0.2, -0.07, Math.sin(a) * 0.2);
    pin.rotation.x = Math.PI;
    baseGroup.add(pin);
  }
  root.add(baseGroup);
  reg.registerPart('baseplate', baseGroup, new THREE.Vector3(0, -0.25, 0));

  // 5. Six Articulated Tail Fibers
  const fibGroup = new THREE.Group();
  fibGroup.position.set(0, 0.82, 0);
  const legMat = makeTissueMat(0x2dd4bf, 0.35);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const fPts = [
      new THREE.Vector3(Math.cos(a) * 0.22, 0.01, Math.sin(a) * 0.22),
      new THREE.Vector3(Math.cos(a) * 0.54, 0.28, Math.sin(a) * 0.54),
      new THREE.Vector3(Math.cos(a) * 0.72, -0.58, Math.sin(a) * 0.72),
    ];
    const leg = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fPts), 16, 0.016, 6, false),
      legMat
    );
    fibGroup.add(leg);
  }
  root.add(fibGroup);
  reg.registerPart('tail_fibers', fibGroup, new THREE.Vector3(0, -0.45, 0.45));

  return finalize(root, reg, (elapsed) => {
    colGroup.scale.y = 1 - (Math.sin(elapsed * 2.4) * 0.5 + 0.5) * 0.12;
    capGroup.rotation.y = elapsed * 0.4;
    dnaGroup.rotation.y = elapsed * 0.4;
  });
}

function buildVolvox(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);
  const centerY = 1.25;

  // 1. Hollow Mucilage Sphere
  const matGroup = new THREE.Group();
  matGroup.position.set(0, centerY, 0);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.84, 32, 24), makeShellMat(0x4ade80, 0.24));
  matGroup.add(sphere);
  root.add(matGroup);
  reg.shellMeshes.push(sphere);
  reg.registerPart('matrix', matGroup, new THREE.Vector3(0, 0.6, 0));

  // 2. Biflagellate Somatic Cells on outer surface
  const somGroup = new THREE.Group();
  somGroup.position.set(0, centerY, 0);
  const somMat = makeTissueMat(0x22c55e, 0.35);
  for (let i = 0; i < 42; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 42);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const v = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
    const cell = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), somMat);
    cell.position.copy(v).multiplyScalar(0.83);
    somGroup.add(cell);
  }
  root.add(somGroup);
  reg.registerPart('somatic_cells', somGroup, new THREE.Vector3(-0.55, 0.3, 0.3));

  // 3. Cytoplasmic Bridges (interconnecting geodesic net)
  const brGroup = new THREE.Group();
  brGroup.position.set(0, centerY, 0);
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.82, 1),
    new THREE.MeshStandardMaterial({ color: 0x86efac, wireframe: true, roughness: 0.4 })
  );
  brGroup.add(wire);
  root.add(brGroup);
  reg.registerPart('bridges', brGroup, new THREE.Vector3(0.55, 0.3, -0.3));

  // 4. Daughter Colonies Inside
  const dauGroup = new THREE.Group();
  dauGroup.position.set(0, centerY, 0);
  const dMat = makeTissueMat(0x16a34a, 0.32, 0x052e16);
  [[-0.25, 0.16, 0.15], [0.28, -0.1, 0.18], [0.04, 0.22, -0.28], [-0.15, -0.24, -0.14]].forEach(([x, y, z], i) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.18 - i * 0.018, 16, 14), dMat);
    d.position.set(x, y, z);
    dauGroup.add(d);
  });
  root.add(dauGroup);
  reg.registerPart('daughters', dauGroup, new THREE.Vector3(0, 0.4, 0.55));

  // 5. Reproductive Gonidia
  const gonGroup = new THREE.Group();
  gonGroup.position.set(0, centerY, 0);
  const gMat = makeTissueMat(0xfacc15, 0.3, 0x713f12);
  [[0.4, 0.3, 0.25], [-0.38, -0.25, 0.35], [0.1, -0.45, -0.3]].forEach(([x, y, z]) => {
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 12), gMat);
    g.position.set(x, y, z);
    gonGroup.add(g);
  });
  root.add(gonGroup);
  reg.registerPart('gonidia', gonGroup, new THREE.Vector3(0.4, -0.45, 0));

  return finalize(root, reg, (elapsed) => {
    somGroup.rotation.y = elapsed * 0.35;
    brGroup.rotation.y = elapsed * 0.35;
    dauGroup.rotation.y = -elapsed * 0.22;
  });
}

// ============================================================================
// 12 PLANTS & FUNGI
// ============================================================================

function buildOakTree(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);
  const barkTex = createBarkTexture('#451a03', '#78350f', maxAniso);
  reg.textures.push(barkTex);
  const barkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.85 });

  // 1. Roots
  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 0.08, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.14, 0.25, Math.sin(a) * 0.14),
      new THREE.Vector3(Math.cos(a) * 0.48, 0.04, Math.sin(a) * 0.48),
      new THREE.Vector3(Math.cos(a) * 0.88, -0.02, Math.sin(a) * 0.88),
    ]);
    rootGroup.add(new THREE.Mesh(new THREE.TubeGeometry(rCurve, 12, 0.06, 8, false), barkMat));
  }
  root.add(rootGroup);
  reg.registerPart('roots', rootGroup, new THREE.Vector3(0, -0.45, 0));

  // 2. Trunk
  const trunkGroup = new THREE.Group();
  trunkGroup.position.set(0, 0.72, 0);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 1.25, 16), barkMat);
  trunkGroup.add(trunk);
  root.add(trunkGroup);
  reg.registerPart('trunk', trunkGroup, new THREE.Vector3(-0.45, 0, 0));

  // 3. Structural Branches
  const brGroup = new THREE.Group();
  brGroup.position.set(0, 1.32, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.82, 10), barkMat);
    br.position.set(Math.cos(a) * 0.3, 0.32, Math.sin(a) * 0.3);
    br.rotation.z = -Math.cos(a) * 0.65;
    br.rotation.x = Math.sin(a) * 0.65;
    brGroup.add(br);
  }
  root.add(brGroup);
  reg.registerPart('branches', brGroup, new THREE.Vector3(0.45, 0.2, 0));

  // 4. Leaf Canopy
  const canGroup = new THREE.Group();
  canGroup.position.set(0, 2.0, 0);
  const leafMat = makeTissueMat(0x16a34a, 0.65);
  const puffs: [number, number, number, number][] = [
    [0, 0.25, 0, 0.62],
    [-0.58, 0.02, 0.2, 0.48],
    [0.58, 0.05, -0.18, 0.5],
    [0.12, -0.02, 0.56, 0.45],
    [-0.15, 0.0, -0.54, 0.46],
  ];
  puffs.forEach(([x, y, z, r]) => {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafMat);
    p.position.set(x, y, z);
    canGroup.add(p);
  });
  root.add(canGroup);
  reg.shellMeshes.push(...(canGroup.children as THREE.Mesh[]));
  reg.registerPart('canopy', canGroup, new THREE.Vector3(0, 0.72, 0));

  // 5. Acorns
  const acGroup = new THREE.Group();
  acGroup.position.set(0, 1.75, 0);
  const nutMat = makeTissueMat(0xb45309, 0.35);
  const capMat = makeTissueMat(0x451a03, 0.8);
  [[0.45, -0.05, 0.45], [-0.45, 0.05, 0.4], [0.22, -0.12, -0.5]].forEach(([x, y, z]) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const nut = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.08, 6, 12), nutMat);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat);
    cap.position.y = 0.05;
    g.add(nut, cap);
    acGroup.add(g);
  });
  root.add(acGroup);
  reg.registerPart('acorns', acGroup, new THREE.Vector3(0.5, 0.45, 0.5));

  return finalize(root, reg, (elapsed) => {
    canGroup.rotation.z = Math.sin(elapsed * 0.8) * 0.025;
  });
}

function buildCactus(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);
  const greenMat = makeTissueMat(0x16a34a, 0.55);

  // 1. Shallow Fibrous Roots
  const rGroup = new THREE.Group();
  rGroup.position.set(0, 0.08, 0);
  const rMat = makeTissueMat(0x92400e, 0.8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.9, 8), rMat);
    rt.position.set(Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42);
    rt.rotation.z = Math.PI / 2;
    rt.rotation.y = -a;
    rGroup.add(rt);
  }
  root.add(rGroup);
  reg.registerPart('roots', rGroup, new THREE.Vector3(0, -0.45, 0));

  // 2. Pleated Succulent Stem Ribs
  const stemGroup = new THREE.Group();
  stemGroup.position.set(0, 1.15, 0);
  const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.45, 12, 20), greenMat);
  stemGroup.add(core);
  for (let r = 0; r < 10; r++) {
    const a = (r / 10) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 1.38, 6, 12), greenMat);
    rib.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
    stemGroup.add(rib);
  }
  root.add(stemGroup);
  reg.registerPart('stem_ribs', stemGroup, new THREE.Vector3(0, 0.2, 0));

  // 3. Upward Saguaro Arms
  const armGroup = new THREE.Group();
  armGroup.position.set(0, 1.25, 0);
  [-1, 1].forEach((side, idx) => {
    const pts = [
      new THREE.Vector3(side * 0.24, idx * 0.22 - 0.1, 0),
      new THREE.Vector3(side * 0.62, idx * 0.22 - 0.05, 0),
      new THREE.Vector3(side * 0.66, idx * 0.22 + 0.58, 0),
    ];
    const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.15, 12, false), greenMat);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), greenMat);
    tip.position.copy(pts[2]);
    armGroup.add(arm, tip);
  });
  root.add(armGroup);
  reg.registerPart('arms', armGroup, new THREE.Vector3(0.65, 0.25, 0));

  // 4. Areole Spine Clusters
  const spGroup = new THREE.Group();
  spGroup.position.set(0, 1.15, 0);
  const spMat = makeTissueMat(0xfef08a, 0.4);
  for (let h = 0; h < 6; h++) {
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2 + h * 0.2;
      const needle = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.14, 5), spMat);
      needle.position.set(Math.cos(a) * 0.34, -0.5 + h * 0.22, Math.sin(a) * 0.34);
      needle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0.2, Math.sin(a)).normalize());
      spGroup.add(needle);
    }
  }
  root.add(spGroup);
  reg.registerPart('spines', spGroup, new THREE.Vector3(-0.55, 0.2, 0.35));

  // 5. Crown Desert Flowers
  const flGroup = new THREE.Group();
  flGroup.position.set(0, 2.18, 0);
  const pMat = makeTissueMat(0xfbbf24, 0.35, 0x78350f);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pet = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), pMat);
    pet.position.set(Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11);
    pet.rotation.z = -Math.cos(a) * 0.7;
    pet.rotation.x = Math.sin(a) * 0.7;
    flGroup.add(pet);
  }
  root.add(flGroup);
  reg.registerPart('flowers', flGroup, new THREE.Vector3(0, 0.65, 0));

  return finalize(root, reg, (elapsed) => {
    flGroup.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.04);
  });
}

function buildVenusFlytrap(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const trapGroup = new THREE.Group();
  trapGroup.position.set(0, 0.82, 0);
  const hairGroup = new THREE.Group();
  hairGroup.position.set(0, 0.82, 0);
  const petGroup = new THREE.Group();
  petGroup.position.set(0, 0.35, 0);

  const outerGreen = makeTissueMat(0x22c55e, 0.45);
  const innerRed = makeTissueMat(0xe11d48, 0.35, 0x4c0519);
  const ciliaMat = makeTissueMat(0x84cc16, 0.4);
  const hairMat = makeTissueMat(0xfef08a, 0.3);

  const trapPivots: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.35;
    // Petiole leaf stalk
    const pCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.1, 0),
      new THREE.Vector3(Math.cos(a) * 0.38, 0.14, Math.sin(a) * 0.38),
      new THREE.Vector3(Math.cos(a) * 0.68, 0.42, Math.sin(a) * 0.68),
    ]);
    const stalk = new THREE.Mesh(new THREE.TubeGeometry(pCurve, 12, 0.065, 8, false), outerGreen);
    stalk.scale.y = 0.45;
    petGroup.add(stalk);

    // Trap lobes
    const trapCenter = new THREE.Group();
    trapCenter.position.set(Math.cos(a) * 0.72, 0.08, Math.sin(a) * 0.72);
    trapCenter.rotation.y = -a + Math.PI / 2;
    [-1, 1].forEach((side) => {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI, 0, Math.PI),
        side === 1 ? outerGreen : innerRed
      );
      lobe.scale.set(1.2, 0.9, 0.35);
      lobe.rotation.x = side * 0.52;
      for (let t = -2; t <= 2; t++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.11, 5), ciliaMat);
        spike.position.set(t * 0.08, 0.22, side * 0.06);
        lobe.add(spike);
      }
      trapCenter.add(lobe);
    });
    trapGroup.add(trapCenter);
    trapPivots.push(trapCenter);

    // Trigger hairs inside trap
    for (let h = -1; h <= 1; h++) {
      const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.009, 0.09, 5), hairMat);
      hair.position.set(Math.cos(a) * 0.72 + h * 0.04, 0.08, Math.sin(a) * 0.72);
      hairGroup.add(hair);
    }
  }

  root.add(trapGroup, hairGroup, petGroup);
  reg.registerPart('traps', trapGroup, new THREE.Vector3(0, 0.5, 0));
  reg.registerPart('trigger_hairs', hairGroup, new THREE.Vector3(0.45, 0.65, 0.3));
  reg.registerPart('petioles', petGroup, new THREE.Vector3(-0.55, 0.15, 0.3));

  // 4. Rhizome & Acidic Bog Roots
  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 0.16, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), makeTissueMat(0xfef08a, 0.5));
  rootGroup.add(bulb);
  for (let r = 0; r < 6; r++) {
    const a = (r / 6) * Math.PI * 2;
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.45, 6), makeTissueMat(0x78350f, 0.7));
    rt.position.set(Math.cos(a) * 0.18, -0.08, Math.sin(a) * 0.18);
    rt.rotation.z = -Math.cos(a) * 0.8;
    rootGroup.add(rt);
  }
  root.add(rootGroup);
  reg.registerPart('rhizome_roots', rootGroup, new THREE.Vector3(0, -0.45, 0));

  // 5. Tall Pollinator Flower Stalk
  const flGroup = new THREE.Group();
  flGroup.position.set(0, 1.35, 0);
  const scape = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 1.5, 10), outerGreen);
  scape.position.y = -0.15;
  flGroup.add(scape);
  const wMat = makeTissueMat(0xf8fafc, 0.25);
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    const pet = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), wMat);
    pet.scale.set(1.2, 0.25, 0.8);
    pet.position.set(Math.cos(a) * 0.1, 0.62, Math.sin(a) * 0.1);
    flGroup.add(pet);
  }
  root.add(flGroup);
  reg.registerPart('flower_stalk', flGroup, new THREE.Vector3(0, 0.75, -0.25));

  return finalize(root, reg, (elapsed) => {
    const snap = Math.max(0, Math.sin(elapsed * 1.4));
    trapPivots[0].scale.z = 1 - snap * 0.35;
  });
}

function buildFern(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);
  const greenMat = makeTissueMat(0x16a34a, 0.5);
  const leafTex = createLeafVeinTexture(maxAniso);
  reg.textures.push(leafTex);

  // 1. Creeping Rhizome
  const rhGroup = new THREE.Group();
  rhGroup.position.set(0, 0.25, 0);
  const rh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.9, 10, 14), makeTissueMat(0x78350f, 0.8));
  rh.rotation.z = Math.PI / 2;
  rhGroup.add(rh);
  root.add(rhGroup);
  reg.registerPart('rhizome', rhGroup, new THREE.Vector3(-0.5, -0.25, 0));

  // 2. Fiddlehead Crosiers
  const fidGroup = new THREE.Group();
  fidGroup.position.set(0, 0.58, 0);
  for (let i = 0; i < 3; i++) {
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= 24; s++) {
      const t = s / 24;
      const r = 0.2 * (1 - t * 0.75);
      const ang = t * Math.PI * 3.2;
      pts.push(new THREE.Vector3((i - 1) * 0.22, t * 0.55 + Math.sin(ang) * r * 0.5, Math.cos(ang) * r));
    }
    fidGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.028, 8, false), greenMat));
  }
  root.add(fidGroup);
  reg.registerPart('fiddleheads', fidGroup, new THREE.Vector3(0, 0.55, 0.4));

  // 3. Pinnate Fronds & 4. Sori Spore Clusters
  const frondGroup = new THREE.Group();
  frondGroup.position.set(0, 0.65, 0);
  const soriGroup = new THREE.Group();
  soriGroup.position.set(0, 0.65, 0);
  const soriMat = makeTissueMat(0xd97706, 0.4);
  const bladeMat = new THREE.MeshStandardMaterial({ map: leafTex, color: 0x22c55e, roughness: 0.48, side: THREE.DoubleSide });

  for (let f = 0; f < 6; f++) {
    const a = (f / 6) * Math.PI * 2;
    const arch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.25, 0),
      new THREE.Vector3(Math.cos(a) * 0.55, 0.85, Math.sin(a) * 0.55),
      new THREE.Vector3(Math.cos(a) * 1.15, 0.45, Math.sin(a) * 1.15),
    ]);
    frondGroup.add(new THREE.Mesh(new THREE.TubeGeometry(arch, 16, 0.022, 6, false), greenMat));
    for (let p = 2; p <= 7; p++) {
      const pt = arch.getPoint(p / 8);
      const pinna = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.08), bladeMat);
      pinna.position.copy(pt);
      pinna.rotation.y = -a + Math.PI / 2;
      frondGroup.add(pinna);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), soriMat);
      dot.position.copy(pt).add(new THREE.Vector3(0, -0.02, 0));
      soriGroup.add(dot);
    }
  }
  root.add(frondGroup, soriGroup);
  reg.registerPart('fronds', frondGroup, new THREE.Vector3(0, 0.65, 0));
  reg.registerPart('sori', soriGroup, new THREE.Vector3(0.55, -0.2, 0.4));

  // 5. Adventitious Vascular Roots
  const vrGroup = new THREE.Group();
  vrGroup.position.set(0, 0.1, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const vr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.55, 6), makeTissueMat(0x92400e, 0.7));
    vr.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    vr.rotation.z = Math.PI / 2;
    vr.rotation.y = -a;
    vrGroup.add(vr);
  }
  root.add(vrGroup);
  reg.registerPart('vascular_roots', vrGroup, new THREE.Vector3(0, -0.45, 0));

  return finalize(root, reg, (elapsed) => {
    frondGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.04;
  });
}

function buildPineTree(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);
  const barkMat = makeTissueMat(0x78350f, 0.85);

  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 0.1, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.72, 8), barkMat);
    rt.position.set(Math.cos(a) * 0.32, 0.04, Math.sin(a) * 0.32);
    rt.rotation.z = Math.PI / 2.2;
    rt.rotation.y = -a;
    rootGroup.add(rt);
  }
  root.add(rootGroup);
  reg.registerPart('roots', rootGroup, new THREE.Vector3(0, -0.45, 0));

  const trunkGroup = new THREE.Group();
  trunkGroup.position.set(0, 1.15, 0);
  trunkGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.24, 2.0, 14), barkMat));
  root.add(trunkGroup);
  reg.registerPart('trunk', trunkGroup, new THREE.Vector3(-0.5, 0, 0));

  const needGroup = new THREE.Group();
  needGroup.position.set(0, 1.55, 0);
  const pineGreen = makeTissueMat(0x166534, 0.65);
  for (let tier = 0; tier < 4; tier++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.95 - tier * 0.18, 0.68, 12), pineGreen);
    cone.position.y = tier * 0.42 - 0.35;
    needGroup.add(cone);
  }
  root.add(needGroup);
  reg.shellMeshes.push(...(needGroup.children as THREE.Mesh[]));
  reg.registerPart('needles', needGroup, new THREE.Vector3(0, 0.65, 0));

  const femGroup = new THREE.Group();
  femGroup.position.set(0.45, 1.65, 0.35);
  const coneMat = makeTissueMat(0x92400e, 0.55);
  for (let i = 0; i < 3; i++) {
    const fc = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), coneMat);
    fc.scale.set(0.75, 1.35, 0.75);
    fc.position.set((i - 1) * 0.18, i * 0.14, (i % 2) * 0.12);
    femGroup.add(fc);
  }
  root.add(femGroup);
  reg.registerPart('female_cone', femGroup, new THREE.Vector3(0.55, 0.35, 0.45));

  const malGroup = new THREE.Group();
  malGroup.position.set(-0.45, 1.25, 0.42);
  const polMat = makeTissueMat(0xfacc15, 0.4);
  for (let i = 0; i < 5; i++) {
    const mc = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.08, 6, 8), polMat);
    mc.position.set(Math.cos(i) * 0.08, (i - 2) * 0.06, Math.sin(i) * 0.08);
    malGroup.add(mc);
  }
  root.add(malGroup);
  reg.registerPart('male_cone', malGroup, new THREE.Vector3(-0.55, 0.2, 0.45));

  return finalize(root, reg, (elapsed) => {
    needGroup.rotation.z = Math.sin(elapsed * 0.7) * 0.02;
  });
}

function buildWaterLily(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  // 1. Floating Pad
  const padGroup = new THREE.Group();
  padGroup.position.set(0, 1.15, 0);
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.98, 0.96, 0.04, 36, 1, false, 0.15, Math.PI * 1.85),
    makeTissueMat(0x16a34a, 0.35)
  );
  padGroup.add(pad);
  root.add(padGroup);
  reg.registerPart('pad', padGroup, new THREE.Vector3(-0.45, 0.35, 0));

  // 2. Underside Air-Chamber Buttress Ribs
  const ribGroup = new THREE.Group();
  ribGroup.position.set(0, 1.1, 0);
  const ribMat = makeTissueMat(0x991b1b, 0.6);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.035, 0.035), ribMat);
    rib.position.set(Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46);
    rib.rotation.y = -a;
    ribGroup.add(rib);
  }
  root.add(ribGroup);
  reg.registerPart('under_ribs', ribGroup, new THREE.Vector3(0, -0.28, 0.45));

  // 3. Thermogenic Lotus/Lily Bloom
  const bloomGroup = new THREE.Group();
  bloomGroup.position.set(0.05, 1.32, 0.05);
  const pMat = makeTissueMat(0xf472b6, 0.28, 0x831843);
  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 10 : 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring * 0.25;
      const pet = new THREE.Mesh(new THREE.SphereGeometry(0.14 - ring * 0.03, 10, 8), pMat);
      pet.scale.set(0.75, 1.4, 0.28);
      pet.position.set(Math.cos(a) * (0.28 - ring * 0.12), ring * 0.08, Math.sin(a) * (0.28 - ring * 0.12));
      pet.rotation.set(Math.sin(a) * (0.6 - ring * 0.25), -a + Math.PI / 2, -Math.cos(a) * (0.6 - ring * 0.25));
      bloomGroup.add(pet);
    }
  }
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), makeTissueMat(0xfacc15, 0.35));
  bloomGroup.add(heart);
  root.add(bloomGroup);
  reg.registerPart('bloom', bloomGroup, new THREE.Vector3(0, 0.68, 0));

  // 4. Submerged Petiole Stem
  const petGroup = new THREE.Group();
  petGroup.position.set(0, 0.62, 0);
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.42, 0),
    new THREE.Vector3(0.14, 0.0, 0.08),
    new THREE.Vector3(0, 0.48, 0),
  ]);
  petGroup.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.045, 10, false), makeTissueMat(0x15803d, 0.45)));
  root.add(petGroup);
  reg.registerPart('petiole', petGroup, new THREE.Vector3(0.45, 0, 0));

  // 5. Pond-Mud Rhizome & Roots
  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 0.15, 0);
  const rh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.55, 8, 12), makeTissueMat(0x78350f, 0.8));
  rh.rotation.z = Math.PI / 2;
  rootGroup.add(rh);
  root.add(rootGroup);
  reg.registerPart('roots', rootGroup, new THREE.Vector3(0, -0.45, 0));

  return finalize(root, reg, (elapsed) => {
    padGroup.position.y = 1.15 + Math.sin(elapsed * 1.4) * 0.02;
    bloomGroup.position.y = 1.32 + Math.sin(elapsed * 1.4) * 0.02;
  });
}

function buildMoss(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.45);

  const rhGroup = new THREE.Group();
  rhGroup.position.set(0, 0.14, 0);
  const rhMat = makeTissueMat(0x78350f, 0.8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.45, 6), rhMat);
    f.position.set(Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25);
    f.rotation.z = Math.PI / 2;
    f.rotation.y = -a;
    rhGroup.add(f);
  }
  root.add(rhGroup);
  reg.registerPart('rhizoids', rhGroup, new THREE.Vector3(0, -0.45, 0));

  const gamGroup = new THREE.Group();
  gamGroup.position.set(0, 0.45, 0);
  const gMat = makeTissueMat(0x22c55e, 0.55);
  for (let c = 0; c < 5; c++) {
    const cx = Math.cos(c * 1.3) * 0.22;
    const cz = Math.sin(c * 1.3) * 0.22;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), gMat);
    stem.position.set(cx, 0, cz);
    gamGroup.add(stem);
    for (let l = 0; l < 6; l++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 5), gMat);
      leaf.position.set(cx + Math.cos(l * 2.1) * 0.06, -0.18 + l * 0.07, cz + Math.sin(l * 2.1) * 0.06);
      leaf.rotation.z = -Math.cos(l * 2.1) * 0.9;
      gamGroup.add(leaf);
    }
  }
  root.add(gamGroup);
  reg.registerPart('gametophyte', gamGroup, new THREE.Vector3(-0.48, 0, 0));

  const setaGroup = new THREE.Group();
  setaGroup.position.set(0, 1.15, 0);
  const sMat = makeTissueMat(0xd97706, 0.45);
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3((i - 1) * 0.16, -0.5, (i % 2) * 0.1),
      new THREE.Vector3((i - 1) * 0.18, 0.1, (i % 2) * 0.12),
      new THREE.Vector3((i - 1) * 0.28, 0.55, (i % 2) * 0.16),
    ]);
    setaGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.015, 6, false), sMat));
  }
  root.add(setaGroup);
  reg.registerPart('seta', setaGroup, new THREE.Vector3(0.45, 0.15, 0));

  const capGroup = new THREE.Group();
  capGroup.position.set(0, 1.72, 0);
  const capMat = makeTissueMat(0xf59e0b, 0.35);
  for (let i = 0; i < 3; i++) {
    const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.16, 8, 12), capMat);
    cap.position.set((i - 1) * 0.28, 0, (i % 2) * 0.16);
    cap.rotation.z = -0.65;
    capGroup.add(cap);
  }
  root.add(capGroup);
  reg.registerPart('capsule', capGroup, new THREE.Vector3(0, 0.55, 0.35));

  const perGroup = new THREE.Group();
  perGroup.position.set(0.14, 1.78, 0.02);
  const tMat = makeTissueMat(0xfef08a, 0.3);
  for (let t = 0; t < 12; t++) {
    const a = (t / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.09, 4), tMat);
    tooth.position.set(Math.cos(a) * 0.055, Math.sin(a) * 0.055, 0);
    tooth.rotation.z = -Math.PI / 2;
    perGroup.add(tooth);
  }
  root.add(perGroup);
  reg.registerPart('peristome', perGroup, new THREE.Vector3(0.55, 0.65, 0));

  return finalize(root, reg, (elapsed) => {
    setaGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.03;
    capGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.03;
  });
}

function buildKelp(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);
  const kelpMat = makeTissueMat(0x3f6212, 0.32);

  // 1. Root-Like Holdfast
  const hGroup = new THREE.Group();
  hGroup.position.set(0, 0.14, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.5, 8), makeTissueMat(0x78350f, 0.7));
    h.position.set(Math.cos(a) * 0.22, -0.02, Math.sin(a) * 0.22);
    h.rotation.z = -Math.cos(a) * 0.9;
    h.rotation.x = Math.sin(a) * 0.9;
    hGroup.add(h);
  }
  root.add(hGroup);
  reg.registerPart('holdfast', hGroup, new THREE.Vector3(0, -0.45, 0));

  // 2. Flexible Stipe Stalk
  const stGroup = new THREE.Group();
  stGroup.position.set(0, 1.15, 0);
  const stCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.95, 0),
    new THREE.Vector3(0.14, -0.2, 0.08),
    new THREE.Vector3(-0.1, 0.55, -0.05),
    new THREE.Vector3(0.05, 1.15, 0),
  ]);
  stGroup.add(new THREE.Mesh(new THREE.TubeGeometry(stCurve, 28, 0.045, 10, false), kelpMat));
  root.add(stGroup);
  reg.registerPart('stipe', stGroup, new THREE.Vector3(-0.45, 0, 0));

  // 3. Gas-Filled Pneumatocysts & 4. Leafy Blades
  const pneGroup = new THREE.Group();
  pneGroup.position.set(0, 1.15, 0);
  const bldGroup = new THREE.Group();
  bldGroup.position.set(0, 1.15, 0);
  const gasMat = makeTissueMat(0x84cc16, 0.22, 0x365314);
  const bladeMat = makeTissueMat(0x4d7c0f, 0.35);

  for (let i = 0; i < 6; i++) {
    const t = 0.2 + i * 0.14;
    const pt = stCurve.getPoint(t);
    const side = i % 2 === 0 ? 1 : -1;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), gasMat);
    bulb.position.copy(pt).add(new THREE.Vector3(side * 0.09, 0.02, 0));
    pneGroup.add(bulb);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.015, 0.18), bladeMat);
    blade.position.copy(pt).add(new THREE.Vector3(side * 0.44, 0.06, 0));
    blade.rotation.z = side * 0.28;
    bldGroup.add(blade);
  }
  root.add(pneGroup, bldGroup);
  reg.registerPart('pneumatocysts', pneGroup, new THREE.Vector3(0.45, 0.3, 0.3));
  reg.registerPart('blades', bldGroup, new THREE.Vector3(0.65, 0.35, -0.2));

  // 5. Basal Reproductive Sporophylls
  const spGroup = new THREE.Group();
  spGroup.position.set(0, 0.42, 0);
  const spMat = makeTissueMat(0xa16207, 0.45);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.015, 0.1), spMat);
    sp.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
    sp.rotation.y = -a;
    spGroup.add(sp);
  }
  root.add(spGroup);
  reg.registerPart('sporophylls', spGroup, new THREE.Vector3(-0.4, -0.25, 0.35));

  return finalize(root, reg, (elapsed) => {
    bldGroup.children.forEach((b, i) => {
      b.rotation.x = Math.sin(elapsed * 2.1 + i * 0.7) * 0.14;
    });
  });
}

function buildPalmTree(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 0.1, 0);
  const rMat = makeTissueMat(0x78350f, 0.85);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.55, 6), rMat);
    rt.position.set(Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24);
    rt.rotation.z = Math.PI / 2;
    rt.rotation.y = -a;
    rootGroup.add(rt);
  }
  root.add(rootGroup);
  reg.registerPart('roots', rootGroup, new THREE.Vector3(0, -0.45, 0));

  // Ringed Fibrous Monocot Trunk
  const trGroup = new THREE.Group();
  trGroup.position.set(0, 1.15, 0);
  const trCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -1.0, 0),
    new THREE.Vector3(-0.14, -0.2, 0.04),
    new THREE.Vector3(0.06, 0.5, 0),
    new THREE.Vector3(0.18, 1.05, 0),
  ]);
  trGroup.add(new THREE.Mesh(new THREE.TubeGeometry(trCurve, 24, 0.13, 12, false), makeTissueMat(0x92400e, 0.8)));
  root.add(trGroup);
  reg.registerPart('trunk', trGroup, new THREE.Vector3(-0.45, 0, 0));

  // Crown Apical Heart
  const crGroup = new THREE.Group();
  crGroup.position.set(0.18, 2.18, 0);
  crGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.25, 12), makeTissueMat(0x84cc16, 0.5)));
  root.add(crGroup);
  reg.registerPart('crown_heart', crGroup, new THREE.Vector3(0, 0.4, 0));

  // Feather Fronds
  const frGroup = new THREE.Group();
  frGroup.position.set(0.18, 2.28, 0);
  const fMat = makeTissueMat(0x16a34a, 0.45);
  for (let f = 0; f < 7; f++) {
    const a = (f / 7) * Math.PI * 2;
    const fCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(a) * 0.48, 0.28, Math.sin(a) * 0.48),
      new THREE.Vector3(Math.cos(a) * 0.96, -0.18, Math.sin(a) * 0.96),
    ]);
    frGroup.add(new THREE.Mesh(new THREE.TubeGeometry(fCurve, 12, 0.025, 6, false), fMat));
    for (let l = 2; l <= 6; l++) {
      const pt = fCurve.getPoint(l / 7);
      const leaflet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.01, 0.055), fMat);
      leaflet.position.copy(pt);
      leaflet.rotation.y = -a + Math.PI / 2;
      frGroup.add(leaflet);
    }
  }
  root.add(frGroup);
  reg.registerPart('fronds', frGroup, new THREE.Vector3(0, 0.72, 0));

  // Coconut Drupes
  const cocGroup = new THREE.Group();
  cocGroup.position.set(0.18, 2.08, 0);
  const cocMat = makeTissueMat(0x78350f, 0.65);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), cocMat);
    nut.position.set(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18);
    cocGroup.add(nut);
  }
  root.add(cocGroup);
  reg.registerPart('coconuts', cocGroup, new THREE.Vector3(0.48, 0.3, 0.4));

  return finalize(root, reg, (elapsed) => {
    frGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.04;
  });
}

function buildSunflower(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  const rootGroup = new THREE.Group();
  rootGroup.position.set(0, 0.14, 0);
  const rMat = makeTissueMat(0xa16207, 0.8);
  rootGroup.add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 8), rMat));
  root.add(rootGroup);
  reg.registerPart('roots', rootGroup, new THREE.Vector3(0, -0.45, 0));

  const stemGroup = new THREE.Group();
  stemGroup.position.set(0, 1.15, 0);
  stemGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 1.9, 12), makeTissueMat(0x22c55e, 0.55)));
  root.add(stemGroup);
  reg.registerPart('stem', stemGroup, new THREE.Vector3(-0.45, 0, 0));

  const leafGroup = new THREE.Group();
  leafGroup.position.set(0, 1.1, 0);
  const leafMat = makeTissueMat(0x16a34a, 0.5);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.8;
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), leafMat);
    lf.scale.set(1.3, 0.12, 0.85);
    lf.position.set(Math.cos(a) * 0.28, (i - 1.5) * 0.3, Math.sin(a) * 0.28);
    lf.rotation.y = -a;
    leafGroup.add(lf);
  }
  root.add(leafGroup);
  reg.registerPart('leaves', leafGroup, new THREE.Vector3(0.45, 0, 0.4));

  const rayGroup = new THREE.Group();
  rayGroup.position.set(0, 2.08, 0.08);
  rayGroup.rotation.x = 0.25;
  const petMat = makeTissueMat(0xfacc15, 0.35, 0x713f12);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const pet = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), petMat);
    pet.scale.set(0.5, 1.75, 0.16);
    pet.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0);
    pet.rotation.z = a - Math.PI / 2;
    rayGroup.add(pet);
  }
  root.add(rayGroup);
  reg.registerPart('ray_florets', rayGroup, new THREE.Vector3(0, 0.65, 0.25));

  const discGroup = new THREE.Group();
  discGroup.position.set(0, 2.08, 0.1);
  discGroup.rotation.x = 0.25;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 24), makeTissueMat(0x451a03, 0.85));
  disc.rotation.x = Math.PI / 2;
  discGroup.add(disc);
  const seedMat = makeTissueMat(0xf59e0b, 0.4);
  for (let s = 0; s < 34; s++) {
    const r = Math.sqrt(s / 34) * 0.28;
    const ang = s * 2.39996; // golden angle
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), seedMat);
    seed.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0.05);
    discGroup.add(seed);
  }
  root.add(discGroup);
  reg.registerPart('disc_florets', discGroup, new THREE.Vector3(0, 0.55, 0.6));

  return finalize(root, reg, (elapsed) => {
    rayGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.15;
    discGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.15;
  });
}

function buildMushroom(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  // 1. Pileus Cap (Fly Agaric crimson speckled cap)
  const capGroup = new THREE.Group();
  capGroup.position.set(0, 1.72, 0);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.54),
    makeTissueMat(0xdc2626, 0.35, 0x450a0a)
  );
  cap.scale.y = 0.72;
  capGroup.add(cap);
  const wartMat = makeTissueMat(0xf8fafc, 0.55);
  for (let w = 0; w < 14; w++) {
    const phi = 0.25 + (w % 4) * 0.22;
    const th = w * 1.4;
    const wart = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), wartMat);
    wart.position.set(Math.sin(phi) * Math.cos(th) * 0.76, Math.cos(phi) * 0.54, Math.sin(phi) * Math.sin(th) * 0.76);
    capGroup.add(wart);
  }
  root.add(capGroup);
  reg.shellMeshes.push(cap);
  reg.registerPart('cap', capGroup, new THREE.Vector3(0, 0.72, 0));

  // 2. Spore-Bearing Gills
  const gillGroup = new THREE.Group();
  gillGroup.position.set(0, 1.68, 0);
  const gillMat = makeTissueMat(0xfef3c7, 0.6);
  for (let g = 0; g < 24; g++) {
    const a = (g / 24) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.012), gillMat);
    blade.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
    blade.rotation.y = -a;
    gillGroup.add(blade);
  }
  root.add(gillGroup);
  reg.registerPart('gills', gillGroup, new THREE.Vector3(0, 0.35, 0.45));

  // 3. Annulus Ring Veil
  const annGroup = new THREE.Group();
  annGroup.position.set(0, 1.38, 0);
  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.14, 18, 1, true), makeTissueMat(0xf1f5f9, 0.55));
  annGroup.add(skirt);
  root.add(annGroup);
  reg.registerPart('annulus', annGroup, new THREE.Vector3(0.45, 0.15, 0));

  // 4. Stipe Stalk
  const stGroup = new THREE.Group();
  stGroup.position.set(0, 0.96, 0);
  const stipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.45, 18), makeTissueMat(0xf8fafc, 0.5));
  stGroup.add(stipe);
  root.add(stGroup);
  reg.registerPart('stipe', stGroup, new THREE.Vector3(-0.45, 0, 0));

  // 5. Subterranean Mycelium Hyphae Network
  const mycGroup = new THREE.Group();
  mycGroup.position.set(0, 0.14, 0);
  const hMat = makeTissueMat(0xe2e8f0, 0.5);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.08, 0),
      new THREE.Vector3(Math.cos(a) * 0.42, 0.02, Math.sin(a) * 0.42),
      new THREE.Vector3(Math.cos(a + 0.3) * 0.85, -0.02, Math.sin(a + 0.3) * 0.85),
    ]);
    mycGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.014, 6, false), hMat));
  }
  root.add(mycGroup);
  reg.registerPart('mycelium', mycGroup, new THREE.Vector3(0, -0.45, 0));

  return finalize(root, reg, (elapsed) => {
    capGroup.position.y = 1.72 + Math.sin(elapsed * 1.4) * 0.015;
  });
}

function buildYeast(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  const cwGroup = new THREE.Group();
  cwGroup.position.set(-0.08, 1.25, 0);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.66, 28, 22), makeShellMat(0xfef08a, 0.34));
  shell.scale.set(1.22, 0.92, 0.92);
  cwGroup.add(shell);
  root.add(cwGroup);
  reg.shellMeshes.push(shell);
  reg.registerPart('cell_wall', cwGroup, new THREE.Vector3(0, 0.55, 0));

  const budGroup = new THREE.Group();
  budGroup.position.set(0.68, 1.38, 0);
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), makeShellMat(0xfde047, 0.42));
  budGroup.add(bud);
  root.add(budGroup);
  reg.registerPart('bud', budGroup, new THREE.Vector3(0.65, 0.25, 0));

  const nucGroup = new THREE.Group();
  nucGroup.position.set(-0.22, 1.28, 0.06);
  nucGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), makeTissueMat(0xa855f7, 0.35, 0x581c87)));
  root.add(nucGroup);
  reg.registerPart('nucleus', nucGroup, new THREE.Vector3(-0.55, 0.42, 0.3));

  const vacGroup = new THREE.Group();
  vacGroup.position.set(0.15, 1.22, -0.12);
  vacGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), makeTissueMat(0x38bdf8, 0.2, 0x0369a1)));
  root.add(vacGroup);
  reg.registerPart('vacuole', vacGroup, new THREE.Vector3(0, 0.45, -0.45));

  const mitGroup = new THREE.Group();
  mitGroup.position.set(-0.05, 1.05, 0.25);
  const mMat = makeTissueMat(0xf97316, 0.35);
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 6, 10), mMat);
    m.position.set((i - 1) * 0.24, 0, -i * 0.12);
    m.rotation.z = Math.PI / 2.2;
    mitGroup.add(m);
  }
  root.add(mitGroup);
  reg.registerPart('mitochondria', mitGroup, new THREE.Vector3(0.35, -0.4, 0.35));

  return finalize(root, reg, (elapsed) => {
    budGroup.scale.setScalar(0.94 + Math.sin(elapsed * 2.0) * 0.08);
  });
}

// ============================================================================
// Dispatcher for 20 Microbes & Plants
// ============================================================================

const MICROBE_PLANT_BUILDERS: Record<string, (maxAniso: number) => SpecimenBuildResult> = {
  animal_cell: buildAnimalCell,
  plant_cell: buildPlantCell,
  bacteria_ecoli: buildBacteriaEcoli,
  paramecium: buildParamecium,
  amoeba: buildAmoeba,
  euglena: buildEuglena,
  bacteriophage: buildBacteriophage,
  volvox: buildVolvox,
  oak_tree: buildOakTree,
  cactus: buildCactus,
  venus_flytrap: buildVenusFlytrap,
  fern: buildFern,
  pine_tree: buildPineTree,
  water_lily: buildWaterLily,
  moss: buildMoss,
  kelp: buildKelp,
  palm_tree: buildPalmTree,
  sunflower: buildSunflower,
  mushroom: buildMushroom,
  yeast: buildYeast,
};

export function buildMicrobeOrPlantSpecimen(
  id: string,
  maxAniso: number
): SpecimenBuildResult | null {
  const builder = MICROBE_PLANT_BUILDERS[id];
  return builder ? builder(maxAniso) : null;
}
