import * as THREE from 'three';
import {
  PartRegistry,
  SpecimenBuildResult,
  addPedestal,
  createCompoundEyeTexture,
  createWingVeinTexture,
} from './anatomyBuilder';

// ---------- Procedural Pattern Textures ----------

function createPatternTexture(
  baseHex: string,
  accentHex: string,
  pattern: 'spots' | 'stripes' | 'scales' | 'feathers' | 'scutes' | 'solid',
  maxAniso: number
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = accentHex;
  ctx.strokeStyle = accentHex;

  if (pattern === 'spots') {
    for (let i = 0; i < 38; i++) {
      const x = (i * 67 + 19) % 256;
      const y = (i * 113 + 23) % 256;
      const r = 6 + (i % 5) * 3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'stripes') {
    for (let y = 0; y < 256; y += 26) {
      ctx.fillRect(0, y, 256, 10);
    }
  } else if (pattern === 'scales') {
    ctx.lineWidth = 2;
    for (let r = 0; r < 14; r++) {
      for (let col = 0; col < 10; col++) {
        const cx = col * 28 + (r % 2 === 0 ? 0 : 14);
        const cy = r * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI);
        ctx.stroke();
      }
    }
  } else if (pattern === 'feathers') {
    ctx.lineWidth = 2;
    for (let r = 0; r < 12; r++) {
      for (let col = 0; col < 8; col++) {
        const cx = col * 32 + (r % 2 === 0 ? 0 : 16);
        const cy = r * 22;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy);
        ctx.quadraticCurveTo(cx, cy + 18, cx + 12, cy);
        ctx.stroke();
      }
    }
  } else if (pattern === 'scutes') {
    ctx.lineWidth = 4;
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 5; col++) {
        ctx.strokeRect(col * 52 + 6, r * 52 + 6, 40, 40);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

function makeMat(
  color: number,
  roughness = 0.55,
  map?: THREE.Texture | null,
  emissive = 0x000000
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: map ?? null,
    roughness,
    metalness: 0.06,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: emissive ? 0.2 : 0,
  });
}

function makeShellMat(
  color: number,
  map?: THREE.Texture | null,
  opacity = 0.36
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    map: map ?? null,
    roughness: 0.42,
    metalness: 0.04,
    transparent: true,
    opacity,
    depthWrite: false,
    clearcoat: 0.35,
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

function addInternalHeartLungs(group: THREE.Group) {
  const heart = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 12),
    makeMat(0xdc2626, 0.35, null, 0x450a0a)
  );
  heart.position.set(0, -0.02, 0.14);
  const lungMat = makeMat(0xfb7185, 0.45);
  [-0.12, 0.12].forEach((x) => {
    const lung = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.18, 6, 12), lungMat);
    lung.position.set(x, 0.04, 0.02);
    lung.rotation.x = Math.PI / 2;
    group.add(lung);
  });
  group.add(heart);
  return heart;
}

function addInternalGut(group: THREE.Group, scale = 1) {
  const gutMat = makeMat(0xf4a28c, 0.45);
  const stomach = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * scale, 0.24 * scale, 8, 12), gutMat);
  stomach.rotation.z = Math.PI / 2;
  const liver = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 12, 10), makeMat(0x7c2d12, 0.4));
  liver.position.set(0.08 * scale, 0.05 * scale, 0.1 * scale);
  group.add(stomach, liver);
}

// ============================================================================
// 1. TERRESTRIAL MAMMAL QUADRUPEDS (12 SPECIES + SPECIALIZED MAMMALS)
// ============================================================================

interface MammalSpec {
  id: string;
  bodyColor: number;
  baseHex: string;
  accentHex: string;
  pattern: 'spots' | 'stripes' | 'solid';
  bodySize: [number, number, number]; // radius, length, heightY
  neckLen: number;
  neckAngle: number;
  headScale: number;
  snoutLen: number;
  earStyle: 'round' | 'long' | 'big' | 'horns' | 'mane';
  legLen: number;
  hindExtra?: number;
  tailLen: number;
  feature?: 'trunk_tusks' | 'pouch' | 'humps' | 'udder' | 'duck_bill' | 'mane';
  // Exact 5 partIds matching organismsPart1.ts in semantic slot order:
  // [headSlot, thoraxSlot, limbsSlot, coreOrFeatureSlot, tailOrExtraSlot]
  partIds: [string, string, string, string, string];
  slotTarget: [
    'head' | 'trunk' | 'ears' | 'bill',
    'thorax' | 'spine' | 'neck' | 'coat' | 'rumen' | 'humps' | 'pouch' | 'forepaws',
    'limbs' | 'legs' | 'paws' | 'hooves' | 'feet' | 'hind_legs' | 'spur',
    'viscera' | 'heart_thorax' | 'ears' | 'tusks' | 'cecum' | 'udder' | 'torso',
    'tail' | 'torso' | 'limbs' | 'neck_tail' | 'mane_tail' | 'thorax'
  ];
}

// Actually even cleaner: each custom builder creates 5 explicit named anatomical groups directly
// mapped to the organism's exact 5 partIds! Zero confusion, 100% accuracy.

function buildQuadrupedMammal(cfg: {
  bodyColor: number;
  baseHex: string;
  accentHex: string;
  pattern: 'spots' | 'stripes' | 'solid';
  torsoR: number;
  torsoLen: number;
  bodyY: number;
  neckLen: number;
  neckTilt: number;
  snoutLen: number;
  earSize: [number, number]; // width, height
  legLen: number;
  hindBoost?: number;
  tailLen: number;
  mane?: boolean;
  horns?: boolean;
  trunkTusks?: boolean;
  pouch?: boolean;
  humps?: boolean;
  udder?: boolean;
  duckBill?: boolean;
  hooves?: boolean;
  // Explicit 5 part IDs & what goes in each group:
  // A = Head / Trunk / Bill
  // B = Thorax / Heart / Neck / Humps / Pouch / Coat
  // C = Limbs / Hooves / Paws / HindLegs
  // D = Viscera / Ears / Tusks / Rumen / Udder / Spur
  // E = Tail / NeckTail / ManeTail / TorsoShell
  mapIds: {
    head: string;
    thorax: string;
    limbs: string;
    organOrFeature: string;
    tailOrExtra: string;
  };
}, maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.68);

  const tex = createPatternTexture(cfg.baseHex, cfg.accentHex, cfg.pattern, maxAniso);
  reg.textures.push(tex);
  const skinShell = makeShellMat(cfg.bodyColor, tex, 0.38);
  const solidCoat = makeMat(cfg.bodyColor, 0.72, tex);
  const darkMat = makeMat(0x1e293b, 0.35);

  const torsoZ = 0;
  const shoulderZ = cfg.torsoLen * 0.45;
  const hipZ = -cfg.torsoLen * 0.45;
  const headY = cfg.bodyY + Math.cos(cfg.neckTilt) * cfg.neckLen * 0.85 + 0.14;
  const headZ = shoulderZ + Math.sin(cfg.neckTilt) * cfg.neckLen + 0.18;

  // --- 1. HEAD GROUP ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, headY, headZ);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(cfg.torsoR * 0.68, 20, 16), solidCoat);
  headGroup.add(cranium);

  if (cfg.duckBill) {
    const bill = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 8, 12), darkMat);
    bill.scale.set(1.2, 0.45, 1.0);
    bill.rotation.x = Math.PI / 2;
    bill.position.set(0, -0.05, 0.26);
    headGroup.add(bill);
  } else {
    const snout = new THREE.Mesh(
      new THREE.CapsuleGeometry(cfg.torsoR * 0.36, cfg.snoutLen, 8, 12),
      solidCoat
    );
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.06, 0.18 + cfg.snoutLen * 0.35);
    headGroup.add(snout);
  }

  // Eyes
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), darkMat);
    eye.position.set(s * cfg.torsoR * 0.42, 0.07, 0.18);
    headGroup.add(eye);
  });

  if (cfg.mane) {
    const mane = new THREE.Mesh(new THREE.TorusGeometry(cfg.torsoR * 0.78, 0.14, 10, 20), makeMat(0x78350f, 0.9));
    mane.position.set(0, -0.02, -0.06);
    headGroup.add(mane);
  }
  if (cfg.horns) {
    [-1, 1].forEach((s) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.32, 10), makeMat(0xf1f5f9, 0.4));
      horn.position.set(s * 0.22, 0.2, -0.04);
      horn.rotation.z = -s * 0.7;
      horn.rotation.x = 0.25;
      headGroup.add(horn);
    });
  }
  if (cfg.trunkTusks) {
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.05, 0.28),
      new THREE.Vector3(0, -0.35, 0.48),
      new THREE.Vector3(0, -0.68, 0.42),
      new THREE.Vector3(0, -0.78, 0.56),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 20, 0.085, 12, false), solidCoat);
    headGroup.add(trunk);
  } else {
    // Ears on head unless separate feature part
    if (cfg.mapIds.organOrFeature !== 'ears') {
      [-1, 1].forEach((s) => {
        const ear = new THREE.Mesh(
          new THREE.CapsuleGeometry(cfg.earSize[0], cfg.earSize[1], 6, 10),
          solidCoat
        );
        ear.position.set(s * cfg.torsoR * 0.56, cfg.torsoR * 0.62, -0.06);
        ear.rotation.z = -s * 0.35;
        headGroup.add(ear);
      });
    }
  }
  root.add(headGroup);
  reg.registerPart(cfg.mapIds.head, headGroup, new THREE.Vector3(0, 0.35, 0.65));

  // --- 2. THORAX / HEART / SHELL GROUP ---
  const thoraxGroup = new THREE.Group();
  thoraxGroup.position.set(0, cfg.bodyY, torsoZ);
  const bodyShell = new THREE.Mesh(
    new THREE.CapsuleGeometry(cfg.torsoR, cfg.torsoLen, 14, 24),
    skinShell
  );
  bodyShell.rotation.x = Math.PI / 2;
  thoraxGroup.add(bodyShell);
  reg.shellMeshes.push(bodyShell);

  // Neck bridge
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(cfg.torsoR * 0.52, cfg.torsoR * 0.68, cfg.neckLen, 14),
    solidCoat
  );
  neck.position.set(0, Math.cos(cfg.neckTilt) * cfg.neckLen * 0.42, shoulderZ + Math.sin(cfg.neckTilt) * cfg.neckLen * 0.42);
  neck.rotation.x = cfg.neckTilt;
  thoraxGroup.add(neck);

  if (cfg.humps) {
    [-0.18, 0.2].forEach((zOff) => {
      const hump = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), makeMat(0xd97706, 0.8));
      hump.scale.set(0.85, 1.15, 0.9);
      hump.position.set(0, cfg.torsoR + 0.14, zOff);
      thoraxGroup.add(hump);
    });
  }
  if (cfg.pouch) {
    const pouch = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.65),
      makeMat(0xd97706, 0.6)
    );
    pouch.position.set(0, -cfg.torsoR * 0.65, -0.1);
    pouch.rotation.x = Math.PI;
    thoraxGroup.add(pouch);
  }
  const heart = addInternalHeartLungs(thoraxGroup);
  root.add(thoraxGroup);
  reg.registerPart(cfg.mapIds.thorax, thoraxGroup, new THREE.Vector3(0, 0.55, 0));

  // --- 3. LIMBS GROUP ---
  const limbGroup = new THREE.Group();
  limbGroup.position.set(0, cfg.bodyY - cfg.torsoR * 0.55, 0);
  const legR = cfg.torsoR * 0.24;
  const hindL = cfg.legLen * (cfg.hindBoost ?? 1);
  const limbPositions: [number, number, number][] = [
    [-cfg.torsoR * 0.68, shoulderZ * 0.78, cfg.legLen],
    [cfg.torsoR * 0.68, shoulderZ * 0.78, cfg.legLen],
    [-cfg.torsoR * 0.68, hipZ * 0.78, hindL],
    [cfg.torsoR * 0.68, hipZ * 0.78, hindL],
  ];
  limbPositions.forEach(([x, z, l], idx) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.82, l, 12), solidCoat);
    leg.position.set(x, -l * 0.45, z);
    if (cfg.hindBoost && idx >= 2) {
      leg.rotation.x = -0.35;
    }
    const paw = new THREE.Mesh(
      cfg.hooves ? new THREE.CylinderGeometry(legR * 1.05, legR * 1.15, 0.08, 12) : new THREE.SphereGeometry(legR * 1.15, 10, 10),
      cfg.hooves ? darkMat : solidCoat
    );
    paw.scale.set(1, 0.65, 1.35);
    paw.position.set(x, -l * 0.9 + 0.04, z + (cfg.hindBoost && idx >= 2 ? 0.14 : 0.04));
    limbGroup.add(leg, paw);
  });
  root.add(limbGroup);
  reg.registerPart(cfg.mapIds.limbs, limbGroup, new THREE.Vector3(0, -0.5, 0));

  // --- 4. FEATURE / VISCERA / EARS / TUSKS / UDDER GROUP ---
  const featGroup = new THREE.Group();
  if (cfg.mapIds.organOrFeature === 'ears') {
    featGroup.position.set(0, headY, headZ - 0.08);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(cfg.earSize[0], 16, 12), solidCoat);
      ear.scale.set(0.28, cfg.earSize[1] * 2.2, 1.1);
      ear.position.set(s * (cfg.torsoR * 0.88 + cfg.earSize[0] * 0.3), cfg.earSize[1] * 0.45, 0);
      ear.rotation.z = -s * 0.25;
      featGroup.add(ear);
    });
  } else if (cfg.mapIds.organOrFeature === 'tusks') {
    featGroup.position.set(0, headY - 0.1, headZ + 0.22);
    const ivoryMat = makeMat(0xf8fafc, 0.25);
    [-1, 1].forEach((s) => {
      const tCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 0.14, 0, 0),
        new THREE.Vector3(s * 0.22, -0.18, 0.28),
        new THREE.Vector3(s * 0.18, 0.04, 0.56),
      ]);
      featGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 14, 0.036, 10, false), ivoryMat));
    });
  } else if (cfg.udder) {
    featGroup.position.set(0, cfg.bodyY - cfg.torsoR * 0.85, hipZ * 0.45);
    featGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), makeMat(0xfbcfe8, 0.5)));
  } else {
    featGroup.position.set(0, cfg.bodyY - 0.05, -0.14);
    addInternalGut(featGroup, cfg.torsoR * 2.4);
  }
  root.add(featGroup);
  reg.registerPart(cfg.mapIds.organOrFeature, featGroup, new THREE.Vector3(0.65, 0.25, 0));

  // --- 5. TAIL / EXTRA GROUP ---
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, cfg.bodyY + 0.06, hipZ - cfg.torsoR * 0.65);
  const tCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -cfg.tailLen * 0.35, -cfg.tailLen * 0.45),
    new THREE.Vector3(0, -cfg.tailLen * 0.15, -cfg.tailLen * 0.9),
  ]);
  const tailMesh = new THREE.Mesh(
    new THREE.TubeGeometry(tCurve, 14, cfg.duckBill ? 0.11 : 0.04, 10, false),
    cfg.duckBill ? darkMat : solidCoat
  );
  if (cfg.duckBill) tailMesh.scale.set(1.5, 0.35, 1);
  tailGroup.add(tailMesh);
  if (cfg.mane) {
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), makeMat(0x78350f, 0.8));
    tuft.position.set(0, -cfg.tailLen * 0.15, -cfg.tailLen * 0.92);
    tailGroup.add(tuft);
  }
  root.add(tailGroup);
  reg.registerPart(cfg.mapIds.tailOrExtra, tailGroup, new THREE.Vector3(0, 0.15, -0.7));

  return finalize(root, reg, (elapsed) => {
    heart.scale.setScalar(1 + Math.pow(Math.max(0, Math.sin(elapsed * 4.5)), 4) * 0.18);
    tailGroup.rotation.y = Math.sin(elapsed * 2.6) * 0.2;
    headGroup.rotation.x = Math.sin(elapsed * 1.3) * 0.05;
  });
}

function buildCetacean(
  isWhale: boolean,
  maxAniso: number
): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.75);

  const skinColor = isWhale ? 0x1e3a8a : 0x64748b;
  const skinMat = makeShellMat(skinColor, null, 0.42);
  const solidSkin = makeMat(skinColor, 0.28);

  // 1. Snout / Baleen / Melon
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.18, 0.88);
  const rostrum = new THREE.Mesh(new THREE.CapsuleGeometry(isWhale ? 0.24 : 0.14, isWhale ? 0.48 : 0.34, 12, 18), solidSkin);
  rostrum.rotation.x = Math.PI / 2;
  headGroup.add(rostrum);
  if (isWhale) {
    const balMat = makeMat(0xfef3c7, 0.6);
    for (let i = -4; i <= 4; i++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.18, 0.06), balMat);
      plate.position.set(i * 0.042, -0.1, 0.15);
      headGroup.add(plate);
    }
  } else {
    const melon = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), makeMat(0x38bdf8, 0.25, null, 0x0369a1));
    melon.position.set(0, 0.09, 0.05);
    headGroup.add(melon);
  }
  root.add(headGroup);
  reg.registerPart(isWhale ? 'baleen' : 'melon', headGroup, new THREE.Vector3(0, 0.25, 0.65));

  // 2. Blowhole & Dorsal Nasal Canal
  const blowGroup = new THREE.Group();
  blowGroup.position.set(0, 1.44, 0.45);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 14), makeMat(0x0f172a, 0.4));
  const mist = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 12), makeShellMat(0xbae6fd, null, 0.35));
  mist.position.y = 0.18;
  mist.rotation.x = Math.PI;
  blowGroup.add(hole, mist);
  root.add(blowGroup);
  reg.registerPart('blowhole', blowGroup, new THREE.Vector3(0, 0.65, 0));

  // 3. Torso / Heart / Dorsal Fin
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 1.18, 0);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(isWhale ? 0.38 : 0.29, 1.35, 16, 26), skinMat);
  body.rotation.x = Math.PI / 2;
  coreGroup.add(body);
  reg.shellMeshes.push(body);
  if (!isWhale) {
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 8), solidSkin);
    dorsal.position.set(0, 0.38, -0.05);
    dorsal.rotation.x = -0.35;
    coreGroup.add(dorsal);
  } else {
    addInternalHeartLungs(coreGroup);
  }
  root.add(coreGroup);
  reg.registerPart(isWhale ? 'heart_core' : 'dorsal_fin', coreGroup, new THREE.Vector3(0, 0.55, 0));

  // 4. Pectoral Flippers (pentadactyl bones visible)
  const flipGroup = new THREE.Group();
  flipGroup.position.set(0, 1.04, 0.32);
  [-1, 1].forEach((s) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.22), skinMat);
    fin.position.set(s * 0.48, -0.06, -0.05);
    fin.rotation.y = -s * 0.4;
    fin.rotation.z = -s * 0.22;
    flipGroup.add(fin);
    reg.shellMeshes.push(fin);
    const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.38, 6, 8), makeMat(0xf5f0e1, 0.4));
    bone.position.set(s * 0.45, -0.06, -0.05);
    bone.rotation.z = Math.PI / 2;
    flipGroup.add(bone);
  });
  root.add(flipGroup);
  reg.registerPart(isWhale ? 'flippers' : 'pectoral', flipGroup, new THREE.Vector3(0, -0.45, 0.35));

  // 5. Horizontal Tail Fluke
  const flukeGroup = new THREE.Group();
  flukeGroup.position.set(0, 1.18, -0.96);
  const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.04, 0.32), solidSkin);
  flukeGroup.add(fluke);
  root.add(flukeGroup);
  reg.registerPart(isWhale ? 'fluke' : 'flukes', flukeGroup, new THREE.Vector3(0, 0, -0.7));

  return finalize(root, reg, (elapsed) => {
    flukeGroup.rotation.x = Math.sin(elapsed * 2.8) * 0.25;
    mist.scale.y = 0.8 + Math.sin(elapsed * 3.5) * 0.3;
  });
}

function buildBat(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);
  const furMat = makeMat(0x44403c, 0.8);
  const wingMem = makeShellMat(0x292524, null, 0.52);

  // 1. Head & Echolocation Ears (`head_ears`)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.48, 0.25);
  headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 14), furMat));
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 10), furMat);
    ear.position.set(s * 0.14, 0.2, 0.02);
    ear.rotation.z = -s * 0.35;
    headGroup.add(ear);
  });
  root.add(headGroup);
  reg.registerPart('head_ears', headGroup, new THREE.Vector3(0, 0.5, 0.45));

  // 2. Patagium Hand Wings (`wings`)
  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, 1.25, 0.05);
  const boneMat = makeMat(0xf5f0e1, 0.4);
  [-1, 1].forEach((s) => {
    const w = new THREE.Group();
    const membrane = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.015, 0.56), wingMem);
    membrane.position.set(s * 0.68, 0, -0.08);
    membrane.rotation.y = s * 0.18;
    w.add(membrane);
    reg.shellMeshes.push(membrane);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.85, 6), boneMat);
      finger.position.set(s * 0.58, 0.01, 0.08 - f * 0.12);
      finger.rotation.z = Math.PI / 2;
      finger.rotation.y = s * (0.25 - f * 0.2);
      w.add(finger);
    }
    wingGroup.add(w);
  });
  root.add(wingGroup);
  reg.registerPart('wings', wingGroup, new THREE.Vector3(0, 0.5, 0));

  // 3. Chest & Heart (`chest_heart`)
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 1.25, 0.05);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.34, 12, 18), makeShellMat(0x57534e, null, 0.42));
  body.rotation.x = Math.PI / 2.6;
  chestGroup.add(body);
  reg.shellMeshes.push(body);
  const heart = addInternalHeartLungs(chestGroup);
  root.add(chestGroup);
  reg.registerPart('chest_heart', chestGroup, new THREE.Vector3(0, 0.25, 0.4));

  // 4. Locking Hind Claws (`hind_claws`)
  const hindGroup = new THREE.Group();
  hindGroup.position.set(0, 0.92, -0.22);
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.32, 8), furMat);
    leg.position.set(s * 0.12, -0.1, 0);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 6), boneMat);
    claw.position.set(s * 0.12, -0.28, 0.04);
    claw.rotation.x = Math.PI * 0.75;
    hindGroup.add(leg, claw);
  });
  root.add(hindGroup);
  reg.registerPart('hind_claws', hindGroup, new THREE.Vector3(0, -0.5, -0.35));

  // 5. Abdomen & Echolocation/Flight Viscera (`abdomen`)
  const abdGroup = new THREE.Group();
  abdGroup.position.set(0, 1.05, -0.14);
  addInternalGut(abdGroup, 0.65);
  root.add(abdGroup);
  reg.registerPart('abdomen', abdGroup, new THREE.Vector3(0, -0.45, 0.3));

  return finalize(root, reg, (elapsed) => {
    wingGroup.children.forEach((w, i) => {
      w.rotation.z = (i === 0 ? 1 : -1) * Math.sin(elapsed * 6.5) * 0.28;
    });
    heart.scale.setScalar(1 + Math.sin(elapsed * 10) * 0.16);
  });
}

function buildChimpanzee(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);
  const fur = makeMat(0x292524, 0.85);
  const skin = makeMat(0xd6a582, 0.55);

  // 1. Brain & Face (`brain_face`)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.82, 0.12);
  headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 16), fur));
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skin);
  face.position.set(0, -0.02, 0.1);
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), skin);
    ear.scale.z = 0.3;
    ear.position.set(s * 0.22, 0.02, 0);
    headGroup.add(ear);
  });
  headGroup.add(face);
  root.add(headGroup);
  reg.registerPart('brain_face', headGroup, new THREE.Vector3(0, 0.6, 0));

  // 2. Long Brachiating Arms (`arms`)
  const armGroup = new THREE.Group();
  armGroup.position.set(0, 1.55, 0);
  [-1, 1].forEach((s) => {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.45, 8, 12), fur);
    upper.position.set(s * 0.34, -0.18, 0.08);
    upper.rotation.z = s * 0.18;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.44, 8, 12), fur);
    fore.position.set(s * 0.4, -0.58, 0.16);
    armGroup.add(upper, fore);
  });
  root.add(armGroup);
  reg.registerPart('arms', armGroup, new THREE.Vector3(-0.6, 0.2, 0));

  // 3. Opposable Hands & Grasping Feet (`hands_feet`)
  const hfGroup = new THREE.Group();
  hfGroup.position.set(0, 0.72, 0.15);
  [-1, 1].forEach((s) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), skin);
    hand.scale.set(0.8, 1.3, 0.5);
    hand.position.set(s * 0.42, 0.02, 0.1);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.22), skin);
    foot.position.set(s * 0.18, -0.58, -0.05);
    hfGroup.add(hand, foot);
  });
  root.add(hfGroup);
  reg.registerPart('hands_feet', hfGroup, new THREE.Vector3(0.55, -0.35, 0.35));

  // 4. Barrel Thorax & Lungs (`thorax`)
  const thGroup = new THREE.Group();
  thGroup.position.set(0, 1.32, 0);
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 12, 18), makeShellMat(0x44403c, null, 0.42));
  thGroup.add(chest);
  reg.shellMeshes.push(chest);
  const heart = addInternalHeartLungs(thGroup);
  root.add(thGroup);
  reg.registerPart('thorax', thGroup, new THREE.Vector3(0, 0.3, 0.45));

  // 5. Pelvis & Knuckle-Walking Legs (`pelvis_legs`)
  const legGroup = new THREE.Group();
  legGroup.position.set(0, 0.72, -0.04);
  const pel = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), fur);
  pel.scale.y = 0.65;
  pel.position.y = 0.2;
  legGroup.add(pel);
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 8, 12), fur);
    leg.position.set(s * 0.17, -0.22, 0);
    legGroup.add(leg);
  });
  root.add(legGroup);
  reg.registerPart('pelvis_legs', legGroup, new THREE.Vector3(0, -0.5, 0));

  return finalize(root, reg, (elapsed) => {
    heart.scale.setScalar(1 + Math.sin(elapsed * 4.2) * 0.16);
    headGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.14;
  });
}

// ============================================================================
// 2. BIRDS (10 SPECIES)
// ============================================================================

function buildBird(cfg: {
  bodyColor: number;
  baseHex: string;
  accentHex: string;
  torsoR: number;
  torsoLen: number;
  bodyY: number;
  neckLen: number;
  beakLen: number;
  beakStyle: 'hook' | 'needle' | 'flat' | 'pouch' | 'downcurve' | 'cone';
  wingSpan: number;
  legLen: number;
  tailType: 'fan' | 'long' | 'peacock' | 'short';
  crest?: boolean;
  facialDisc?: boolean;
  mapIds: {
    head: string;
    wings: string;
    core: string;
    legs: string;
    tailOrExtra: string;
  };
}, maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.58);

  const tex = createPatternTexture(cfg.baseHex, cfg.accentHex, 'feathers', maxAniso);
  reg.textures.push(tex);
  const plumMat = makeMat(cfg.bodyColor, 0.65, tex);
  const shellMat = makeShellMat(cfg.bodyColor, tex, 0.36);
  const beakMat = makeMat(0xf59e0b, 0.35);

  // 1. Head / Beak / Pouch
  const headGroup = new THREE.Group();
  const headY = cfg.bodyY + 0.25 + cfg.neckLen;
  const headZ = 0.28 + (cfg.neckLen > 0.4 ? 0.16 : 0.1);
  headGroup.position.set(0, headY, headZ);
  headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), plumMat));

  if (cfg.facialDisc) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 18), makeMat(0xfef3c7, 0.7));
    disc.rotation.x = Math.PI / 2;
    disc.position.z = 0.08;
    headGroup.add(disc);
  }
  if (cfg.crest) {
    for (let c = -2; c <= 2; c++) {
      const feather = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.18, 6), makeMat(0x2dd4bf, 0.35));
      feather.position.set(c * 0.03, 0.22, -0.02);
      feather.rotation.z = -c * 0.12;
      headGroup.add(feather);
    }
  }
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), makeMat(0x0f172a, 0.2));
    eye.position.set(s * 0.09, 0.04, 0.11);
    headGroup.add(eye);
  });

  if (cfg.beakStyle === 'pouch') {
    const upper = new THREE.Mesh(new THREE.ConeGeometry(0.05, cfg.beakLen, 8), beakMat);
    upper.rotation.x = Math.PI / 2;
    upper.position.set(0, 0.02, cfg.beakLen * 0.55);
    const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), makeMat(0xfb923c, 0.45));
    pouch.scale.set(0.6, 0.9, 2.2);
    pouch.position.set(0, -0.09, cfg.beakLen * 0.42);
    headGroup.add(upper, pouch);
  } else {
    const bGeo =
      cfg.beakStyle === 'flat'
        ? new THREE.BoxGeometry(0.11, 0.04, cfg.beakLen)
        : new THREE.ConeGeometry(cfg.beakStyle === 'needle' ? 0.022 : 0.05, cfg.beakLen, 8);
    const beak = new THREE.Mesh(bGeo, beakMat);
    if (cfg.beakStyle !== 'flat') beak.rotation.x = Math.PI / 2 + (cfg.beakStyle === 'downcurve' ? 0.45 : 0);
    beak.position.set(0, -0.02, 0.12 + cfg.beakLen * 0.42);
    headGroup.add(beak);
  }
  root.add(headGroup);
  reg.registerPart(cfg.mapIds.head, headGroup, new THREE.Vector3(0, 0.48, 0.55));

  // 2. Wings / Flippers
  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, cfg.bodyY + 0.12, 0.08);
  [-1, 1].forEach((s) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(cfg.wingSpan, 0.032, 0.34), plumMat);
    w.position.set(s * (cfg.torsoR + cfg.wingSpan * 0.48), 0, -0.04);
    w.rotation.y = -s * 0.16;
    if (cfg.beakStyle === 'cone' && cfg.tailType === 'short') {
      // Penguin tucked hydrofoil flippers
      w.rotation.z = s * 1.1;
    }
    wingGroup.add(w);
  });
  root.add(wingGroup);
  reg.registerPart(cfg.mapIds.wings, wingGroup, new THREE.Vector3(0, 0.55, 0));

  // 3. Torso / Lungs / Heart / Neck / Crop
  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, cfg.bodyY, 0);
  const bodyShell = new THREE.Mesh(new THREE.CapsuleGeometry(cfg.torsoR, cfg.torsoLen, 12, 20), shellMat);
  bodyShell.rotation.x = Math.PI / 2.8;
  coreGroup.add(bodyShell);
  reg.shellMeshes.push(bodyShell);

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.12, 0.18),
    new THREE.Vector3(0, 0.12 + cfg.neckLen * 0.55, cfg.neckLen > 0.4 ? 0.06 : 0.25),
    new THREE.Vector3(0, 0.22 + cfg.neckLen, 0.28 + (cfg.neckLen > 0.4 ? 0.16 : 0.1)),
  ]);
  coreGroup.add(new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 14, 0.068, 10, false), plumMat));
  const heart = addInternalHeartLungs(coreGroup);
  root.add(coreGroup);
  reg.registerPart(cfg.mapIds.core, coreGroup, new THREE.Vector3(0, 0.35, 0));

  // 4. Legs / Talons / Webbed Feet
  const legGroup = new THREE.Group();
  legGroup.position.set(0, cfg.bodyY - cfg.torsoR * 0.6, 0);
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, cfg.legLen, 8), beakMat);
    leg.position.set(s * 0.13, -cfg.legLen * 0.48, 0);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.18), beakMat);
    foot.position.set(s * 0.13, -cfg.legLen * 0.96, 0.05);
    legGroup.add(leg, foot);
  });
  root.add(legGroup);
  reg.registerPart(cfg.mapIds.legs, legGroup, new THREE.Vector3(0, -0.5, 0));

  // 5. Tail / Train / Plumage / Viscera
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, cfg.bodyY - 0.06, -cfg.torsoLen * 0.65);
  if (cfg.tailType === 'peacock') {
    for (let i = -4; i <= 4; i++) {
      const quill = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.014, 0.95), makeMat(0x16a34a, 0.35));
      quill.position.set(i * 0.13, 0.35, -0.45);
      quill.rotation.y = -i * 0.16;
      quill.rotation.x = 0.55;
      const eyeSpot = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), makeMat(0x2563eb, 0.25, null, 0x1e40af));
      eyeSpot.scale.set(1, 0.3, 1.3);
      eyeSpot.position.set(0, 0.015, -0.42);
      quill.add(eyeSpot);
      tailGroup.add(quill);
    }
  } else {
    const tFan = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.tailType === 'short' ? 0.18 : 0.42, 0.024, cfg.tailType === 'long' ? 0.62 : 0.34),
      plumMat
    );
    tFan.position.set(0, 0.04, -0.18);
    tailGroup.add(tFan);
  }
  root.add(tailGroup);
  reg.registerPart(cfg.mapIds.tailOrExtra, tailGroup, new THREE.Vector3(0, 0.2, -0.7));

  return finalize(root, reg, (elapsed) => {
    const speed = cfg.beakStyle === 'needle' ? 14 : 3.5;
    wingGroup.children.forEach((w, i) => {
      if (!(cfg.beakStyle === 'cone' && cfg.tailType === 'short')) {
        w.rotation.z = (i === 0 ? 1 : -1) * Math.sin(elapsed * speed) * 0.22;
      }
    });
    heart.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.14);
  });
}

// ============================================================================
// 3. REPTILES & AMPHIBIANS (12 SPECIES)
// ============================================================================

function buildTurtleSpecies(isSea: boolean, maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  const tex = createPatternTexture('#166534', '#84cc16', 'scutes', maxAniso);
  reg.textures.push(tex);
  const shellMat = makeShellMat(isSea ? 0x15803d : 0x57534e, tex, 0.45);
  const skinMat = makeMat(isSea ? 0x22c55e : 0x78716c, 0.6);

  // 1. Carapace / Dome Shell
  const carGroup = new THREE.Group();
  carGroup.position.set(0, 1.15, 0);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
    shellMat
  );
  dome.scale.set(0.88, isSea ? 0.52 : 0.85, 1.18);
  carGroup.add(dome);
  reg.shellMeshes.push(dome);
  const heart = addInternalHeartLungs(carGroup);
  root.add(carGroup);
  reg.registerPart(isSea ? 'carapace' : 'dome_shell', carGroup, new THREE.Vector3(0, 0.68, 0));

  // 2. Plastron Ventral Plate
  const plaGroup = new THREE.Group();
  plaGroup.position.set(0, 1.05, 0);
  const plastron = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.54, 0.08, 20), makeMat(0xfef08a, 0.55));
  plastron.scale.set(0.85, 1, 1.18);
  plaGroup.add(plastron);
  root.add(plaGroup);
  reg.registerPart('plastron', plaGroup, new THREE.Vector3(0, -0.5, 0));

  // 3. Head & Neck
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0.88);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.36, 12), skinMat);
  neck.rotation.x = Math.PI / 2.2;
  neck.position.z = -0.14;
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skinMat);
  hd.scale.set(0.88, 0.82, 1.18);
  headGroup.add(neck, hd);
  root.add(headGroup);
  reg.registerPart(isSea ? 'head' : 'head_neck', headGroup, new THREE.Vector3(0, 0.2, 0.65));

  // 4. Flippers / Elephant Legs
  const limbGroup = new THREE.Group();
  limbGroup.position.set(0, 0.98, 0);
  if (isSea) {
    [-1, 1].forEach((s) => {
      const flipper = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.24), skinMat);
      flipper.position.set(s * 0.65, 0.02, 0.28);
      flipper.rotation.y = -s * 0.38;
      limbGroup.add(flipper);
    });
  } else {
    [[-0.4, 0.42], [0.4, 0.42], [-0.4, -0.42], [0.4, -0.42]].forEach(([x, z]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.46, 12), skinMat);
      col.position.set(x, -0.15, z);
      limbGroup.add(col);
    });
  }
  root.add(limbGroup);
  reg.registerPart(isSea ? 'flippers' : 'elephant_legs', limbGroup, new THREE.Vector3(0, -0.45, 0.3));

  // 5. Tail / Viscera
  const fifthGroup = new THREE.Group();
  if (isSea) {
    fifthGroup.position.set(0, 1.0, -0.82);
    [-1, 1].forEach((s) => {
      const hf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.2), skinMat);
      hf.position.set(s * 0.24, 0, 0);
      hf.rotation.y = -s * 0.4;
      fifthGroup.add(hf);
    });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24, 8), skinMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.1;
    fifthGroup.add(tail);
    root.add(fifthGroup);
    reg.registerPart('tail', fifthGroup, new THREE.Vector3(0, 0, -0.65));
  } else {
    fifthGroup.position.set(0, 1.12, 0);
    addInternalGut(fifthGroup, 1.1);
    root.add(fifthGroup);
    reg.registerPart('viscera', fifthGroup, new THREE.Vector3(0.55, 0.35, 0));
  }

  return finalize(root, reg, (elapsed) => {
    heart.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.14);
    if (isSea) {
      limbGroup.children.forEach((f, i) => {
        f.rotation.z = (i === 0 ? 1 : -1) * Math.sin(elapsed * 2.6) * 0.25;
      });
    }
  });
}

function buildCobra(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.6);

  const tex = createPatternTexture('#a16207', '#451a03', 'scales', maxAniso);
  reg.textures.push(tex);
  const scaleMat = makeMat(0xca8a04, 0.45, tex);

  // 1. Head & Hollow Fangs
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.98, 0.22);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), scaleMat);
  hd.scale.set(1.05, 0.68, 1.35);
  headGroup.add(hd);
  const fangMat = makeMat(0xf8fafc, 0.2);
  [-1, 1].forEach((s) => {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.1, 8), fangMat);
    fang.position.set(s * 0.06, -0.07, 0.14);
    fang.rotation.x = Math.PI;
    headGroup.add(fang);
  });
  root.add(headGroup);
  reg.registerPart('head_fangs', headGroup, new THREE.Vector3(0, 0.65, 0.35));

  // 2. Forked Tongue
  const tongGroup = new THREE.Group();
  tongGroup.position.set(0, 1.93, 0.44);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.24, 6), makeMat(0xec4899, 0.3));
  stem.rotation.x = Math.PI / 2;
  [-1, 1].forEach((s) => {
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.009, 0.1, 6), makeMat(0xec4899, 0.3));
    fork.position.set(s * 0.03, 0, 0.14);
    fork.rotation.x = Math.PI / 2;
    fork.rotation.z = -s * 0.35;
    tongGroup.add(fork);
  });
  tongGroup.add(stem);
  root.add(tongGroup);
  reg.registerPart('tongue_sense', tongGroup, new THREE.Vector3(0, 0.35, 0.75));

  // 3. Flared Cervical Hood Ribs
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0, 1.64, 0.1);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), makeMat(0xeab308, 0.5, tex));
  hood.scale.set(1.0, 1.28, 0.22);
  hoodGroup.add(hood);
  root.add(hoodGroup);
  reg.registerPart('hood', hoodGroup, new THREE.Vector3(0.55, 0.3, 0));

  // 4. Spine & Elongated Single Lung
  const spGroup = new THREE.Group();
  spGroup.position.set(0, 1.0, 0);
  const torsoPts = [
    new THREE.Vector3(0, 0.75, 0.12),
    new THREE.Vector3(0, 0.25, -0.05),
    new THREE.Vector3(0.18, -0.45, 0.15),
    new THREE.Vector3(0.45, -0.75, 0),
  ];
  const sCurve = new THREE.CatmullRomCurve3(torsoPts);
  const sShell = new THREE.Mesh(new THREE.TubeGeometry(sCurve, 28, 0.13, 14, false), makeShellMat(0xca8a04, tex, 0.38));
  spGroup.add(sShell);
  reg.shellMeshes.push(sShell);
  const lung = new THREE.Mesh(new THREE.TubeGeometry(sCurve, 24, 0.06, 10, false), makeMat(0xfb7185, 0.4));
  spGroup.add(lung);
  root.add(spGroup);
  reg.registerPart('spine_lung', spGroup, new THREE.Vector3(-0.5, 0.2, 0));

  // 5. Coiled Scales & Tapered Tail
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.28, 0);
  const coilPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 3.5;
    const rad = 0.78 * (1 - t * 0.55);
    coilPts.push(new THREE.Vector3(Math.cos(a) * rad, t * 0.14, Math.sin(a) * rad));
  }
  tailGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 40, 0.095, 12, false), scaleMat));
  root.add(tailGroup);
  reg.registerPart('tail_scales', tailGroup, new THREE.Vector3(0, -0.45, 0));

  return finalize(root, reg, (elapsed) => {
    tongGroup.position.z = 0.44 + Math.max(0, Math.sin(elapsed * 4.5)) * 0.1;
    hoodGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.12;
  });
}

function buildLizardOrCroco(
  variant: 'crocodile' | 'chameleon' | 'komodo_dragon' | 'iguana',
  maxAniso: number
): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  const colorMap: Record<typeof variant, number> = {
    crocodile: 0x3f6212,
    chameleon: 0x22c55e,
    komodo_dragon: 0x57534e,
    iguana: 0x16a34a,
  };
  const tex = createPatternTexture(
    variant === 'komodo_dragon' ? '#44403c' : '#15803d',
    variant === 'chameleon' ? '#facc15' : '#0f172a',
    'scales',
    maxAniso
  );
  reg.textures.push(tex);
  const skinMat = makeMat(colorMap[variant], 0.55, tex);
  const shellMat = makeShellMat(colorMap[variant], tex, 0.42);

  // 1. Head / Jaws / Turret Eyes / Third Eye
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0.72);
  headGroup.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, variant === 'crocodile' ? 0.52 : 0.22, 10, 14), skinMat).rotateX(Math.PI / 2));
  if (variant === 'chameleon') {
    const casque = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 8), skinMat);
    casque.position.set(0, 0.2, -0.06);
    [-1, 1].forEach((s) => {
      const turret = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.11, 12), skinMat);
      turret.rotation.z = -s * Math.PI / 2;
      turret.position.set(s * 0.14, 0.05, 0.08);
      headGroup.add(turret);
    });
    headGroup.add(casque);
  } else if (variant === 'iguana') {
    const thirdEye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), makeMat(0xbae6fd, 0.15));
    thirdEye.position.set(0, 0.14, -0.02);
    headGroup.add(thirdEye);
  }
  root.add(headGroup);

  const headPartId =
    variant === 'chameleon'
      ? 'eyes_casque'
      : variant === 'iguana'
      ? 'third_eye'
      : 'jaws';
  reg.registerPart(headPartId, headGroup, new THREE.Vector3(0, 0.35, 0.65));

  // 2. Torso / Osteoderms / Skin / Crest
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 1.05, 0);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.85, 12, 18), shellMat);
  torso.rotation.x = Math.PI / 2;
  bodyGroup.add(torso);
  reg.shellMeshes.push(torso);
  if (variant === 'iguana') {
    for (let s = 0; s < 8; s++) {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.16, 6), makeMat(0x4ade80, 0.4));
      spine.position.set(0, 0.28, 0.42 - s * 0.12);
      bodyGroup.add(spine);
    }
  }
  const heart = addInternalHeartLungs(bodyGroup);
  root.add(bodyGroup);

  const bodyPartId =
    variant === 'crocodile'
      ? 'osteoderms'
      : variant === 'chameleon'
      ? 'skin_cells'
      : variant === 'komodo_dragon'
      ? 'armor_torso'
      : 'dorsal_crest';
  reg.registerPart(bodyPartId, bodyGroup, new THREE.Vector3(0, 0.52, 0));

  // 3. Limbs
  const limbGroup = new THREE.Group();
  limbGroup.position.set(0, 0.86, 0);
  [[-0.32, 0.35], [0.32, 0.35], [-0.32, -0.35], [0.32, -0.35]].forEach(([x, z]) => {
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.28, 6, 10), skinMat);
    upper.position.set(x, 0, z);
    upper.rotation.z = x > 0 ? -0.8 : 0.8;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), skinMat);
    foot.scale.set(1.2, 0.5, 1.3);
    foot.position.set(x * 1.45, -0.14, z);
    limbGroup.add(upper, foot);
  });
  root.add(limbGroup);
  const limbPartId =
    variant === 'chameleon'
      ? 'zygodactyl_feet'
      : variant === 'iguana'
      ? 'gut_limbs'
      : 'limbs';
  reg.registerPart(limbPartId, limbGroup, new THREE.Vector3(0, -0.45, 0));

  // 4. Special Organ / Tongue / Heart / Dewlap
  const specGroup = new THREE.Group();
  if (variant === 'chameleon' || variant === 'komodo_dragon') {
    specGroup.position.set(0, 1.12, 0.98);
    const tong = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.024, variant === 'chameleon' ? 0.85 : 0.35, 8),
      makeMat(variant === 'chameleon' ? 0xfb7185 : 0xfacc15, 0.3)
    );
    tong.rotation.x = Math.PI / 2;
    tong.position.z = variant === 'chameleon' ? 0.38 : 0.16;
    specGroup.add(tong);
    root.add(specGroup);
    reg.registerPart('tongue', specGroup, new THREE.Vector3(0, 0.25, 0.8));
  } else if (variant === 'iguana') {
    specGroup.position.set(0, 0.94, 0.68);
    const dewlap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), makeMat(0x4ade80, 0.5));
    dewlap.scale.set(0.24, 1.25, 0.9);
    specGroup.add(dewlap);
    root.add(specGroup);
    reg.registerPart('dewlap', specGroup, new THREE.Vector3(0, -0.35, 0.55));
  } else {
    specGroup.position.set(0, 1.05, 0.12);
    addInternalGut(specGroup, 0.9);
    root.add(specGroup);
    reg.registerPart('heart_lungs', specGroup, new THREE.Vector3(0.6, 0.35, 0));
  }

  // 5. Tail
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.98, -0.62);
  if (variant === 'chameleon') {
    const spiralPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const a = t * Math.PI * 3;
      const rad = 0.28 * (1 - t * 0.72);
      spiralPts.push(new THREE.Vector3(0, Math.sin(a) * rad, -0.25 - Math.cos(a) * rad));
    }
    tailGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 28, 0.055, 8, false), skinMat));
  } else {
    const tCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.14, -0.05, -0.45),
      new THREE.Vector3(-0.08, -0.1, -0.95),
    ]);
    tailGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 18, 0.085, 10, false), skinMat));
  }
  root.add(tailGroup);
  reg.registerPart('tail', tailGroup, new THREE.Vector3(0, 0.15, -0.7));

  return finalize(root, reg, (elapsed) => {
    heart.scale.setScalar(1 + Math.sin(elapsed * 2.5) * 0.14);
    tailGroup.rotation.y = Math.sin(elapsed * 2.1) * 0.18;
  });
}

function buildAmphibian(
  variant: 'frog' | 'axolotl' | 'salamander' | 'dart_frog' | 'toad',
  maxAniso: number
): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const isTailed = variant === 'axolotl' || variant === 'salamander';
  const colorMap: Record<typeof variant, number> = {
    frog: 0x4d7c0f,
    axolotl: 0xfbcfe8,
    salamander: 0x1e293b,
    dart_frog: 0x2563eb,
    toad: 0x78350f,
  };
  const tex = createPatternTexture(
    variant === 'salamander' ? '#0f172a' : variant === 'dart_frog' ? '#1d4ed8' : '#3f6212',
    variant === 'salamander' || variant === 'dart_frog' ? '#facc15' : '#84cc16',
    variant === 'salamander' || variant === 'dart_frog' ? 'spots' : 'solid',
    maxAniso
  );
  reg.textures.push(tex);
  const skinMat = makeMat(colorMap[variant], variant === 'toad' ? 0.85 : 0.28, tex);
  const shellMat = makeShellMat(colorMap[variant], tex, 0.38);

  // 1. Head / Eyes / Parotoids
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0.42);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), skinMat);
  hd.scale.set(1.18, 0.72, 1.15);
  headGroup.add(hd);
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), makeMat(0xfacc15, 0.15));
    eye.position.set(s * 0.14, 0.12, 0.12);
    headGroup.add(eye);
  });
  root.add(headGroup);

  const headPartId =
    variant === 'axolotl'
      ? 'head'
      : variant === 'salamander'
      ? 'head_glands'
      : variant === 'toad'
      ? 'head'
      : 'head_eyes';
  reg.registerPart(headPartId, headGroup, new THREE.Vector3(0, 0.38, 0.55));

  // 2. Torso / Skin / Viscera
  const skinGroup = new THREE.Group();
  skinGroup.position.set(0, 1.05, 0);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, isTailed ? 0.65 : 0.35, 12, 18), shellMat);
  torso.rotation.x = Math.PI / 2.2;
  skinGroup.add(torso);
  reg.shellMeshes.push(torso);
  root.add(skinGroup);

  const skinPartId =
    variant === 'frog'
      ? 'skin'
      : variant === 'axolotl'
      ? 'torso'
      : variant === 'salamander'
      ? 'skin_torso'
      : variant === 'dart_frog'
      ? 'skin_alkaloids'
      : 'warty_skin';
  reg.registerPart(skinPartId, skinGroup, new THREE.Vector3(0, 0.55, 0));

  // 3. Special Feature (External Gills / Tympanum / Parotoid Glands / Viscera)
  const featGroup = new THREE.Group();
  if (variant === 'axolotl') {
    featGroup.position.set(0, 1.18, 0.25);
    const gillMat = makeMat(0xf43f5e, 0.35, null, 0x881337);
    [-1, 1].forEach((s) => {
      for (let g = 0; g < 3; g++) {
        const frond = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.26, 6, 8), gillMat);
        frond.position.set(s * 0.28, (g - 1) * 0.08, -g * 0.04);
        frond.rotation.z = -s * (1.1 + g * 0.2);
        featGroup.add(frond);
      }
    });
    root.add(featGroup);
    reg.registerPart('gills', featGroup, new THREE.Vector3(0.6, 0.45, 0.2));
  } else if (variant === 'frog') {
    featGroup.position.set(0, 1.08, 0.42);
    const sac = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), makeMat(0xfacc15, 0.35));
    sac.position.set(0, -0.06, 0.08);
    featGroup.add(sac);
    root.add(featGroup);
    reg.registerPart('tympanum_sac', featGroup, new THREE.Vector3(-0.5, 0.2, 0.4));
  } else if (variant === 'toad') {
    featGroup.position.set(0, 1.18, 0.22);
    [-1, 1].forEach((s) => {
      const gland = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.14, 8, 12), makeMat(0xb45309, 0.65));
      gland.position.set(s * 0.2, 0.08, 0);
      gland.rotation.x = Math.PI / 2;
      featGroup.add(gland);
    });
    root.add(featGroup);
    reg.registerPart('parotoids', featGroup, new THREE.Vector3(0.55, 0.4, 0.2));
  } else {
    featGroup.position.set(0, 1.05, 0);
    addInternalGut(featGroup, 0.78);
    root.add(featGroup);
    const vid = variant === 'salamander' ? 'lungs_viscera' : 'viscera';
    reg.registerPart(vid, featGroup, new THREE.Vector3(0.55, 0.3, 0));
  }

  // 4. Limbs / Hind Legs / Toe Pads
  const legGroup = new THREE.Group();
  legGroup.position.set(0, 0.85, 0);
  if (isTailed) {
    [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25]].forEach(([x, z]) => {
      const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.22, 6, 10), skinMat);
      l.position.set(x, -0.05, z);
      l.rotation.z = x > 0 ? -0.75 : 0.75;
      legGroup.add(l);
    });
  } else {
    [-1, 1].forEach((s) => {
      const front = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.28, 8), skinMat);
      front.position.set(s * 0.22, -0.05, 0.25);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 8, 12), skinMat);
      thigh.position.set(s * 0.26, 0.0, -0.18);
      thigh.rotation.x = -0.8;
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.035, 0.34, 8), skinMat);
      shin.position.set(s * 0.3, -0.16, -0.24);
      legGroup.add(front, thigh, shin);
    });
  }
  root.add(legGroup);
  const legPartId =
    variant === 'axolotl' || variant === 'salamander' || variant === 'toad'
      ? 'limbs'
      : 'hind_legs';
  reg.registerPart(legPartId, legGroup, new THREE.Vector3(0, -0.45, -0.3));

  // 5. Heart / Tail / ToePads
  const fifthGroup = new THREE.Group();
  if (isTailed) {
    fifthGroup.position.set(0, 1.0, -0.45);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.75, 12), skinMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.35;
    if (variant === 'axolotl') tail.scale.x = 0.28;
    fifthGroup.add(tail);
    root.add(fifthGroup);
    reg.registerPart('tail', fifthGroup, new THREE.Vector3(0, 0.15, -0.7));
  } else if (variant === 'dart_frog') {
    fifthGroup.position.set(0, 0.72, 0.25);
    const padMat = makeMat(0x38bdf8, 0.25);
    [-1, 1].forEach((s) => {
      for (let d = -1; d <= 1; d++) {
        const pad = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), padMat);
        pad.position.set(s * 0.24 + d * 0.03, 0, 0.08);
        fifthGroup.add(pad);
      }
    });
    root.add(fifthGroup);
    reg.registerPart('toe_pads', fifthGroup, new THREE.Vector3(0, -0.35, 0.55));
  } else {
    fifthGroup.position.set(0, 1.05, 0.08);
    const h = addInternalHeartLungs(fifthGroup);
    root.add(fifthGroup);
    reg.registerPart(variant === 'frog' ? 'heart_lungs' : 'torso', fifthGroup, new THREE.Vector3(0.55, 0.3, 0));
    return finalize(root, reg, (elapsed) => {
      h.scale.setScalar(1 + Math.sin(elapsed * 3.5) * 0.15);
    });
  }

  return finalize(root, reg, (elapsed) => {
    if (variant === 'axolotl') {
      featGroup.rotation.z = Math.sin(elapsed * 2.5) * 0.08;
    }
    if (isTailed) {
      fifthGroup.rotation.y = Math.sin(elapsed * 2.4) * 0.2;
    }
  });
}

// ============================================================================
// 4. FISH & MARINE INVERTEBRATES (14 SPECIES)
// ============================================================================

function buildShark(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.7);
  const sharkMat = makeMat(0x64748b, 0.32);
  const shellMat = makeShellMat(0x94a3b8, null, 0.42);

  // 1. Snout & Teeth
  const snoutGroup = new THREE.Group();
  snoutGroup.position.set(0, 1.18, 0.85);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 16), sharkMat);
  cone.rotation.x = Math.PI / 2;
  snoutGroup.add(cone);
  const tMat = makeMat(0xf8fafc, 0.25);
  for (let i = -3; i <= 3; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.045, 4), tMat);
    tooth.position.set(i * 0.036, -0.08, 0.05);
    tooth.rotation.x = Math.PI;
    snoutGroup.add(tooth);
  }
  root.add(snoutGroup);
  reg.registerPart('snout', snoutGroup, new THREE.Vector3(0, 0.18, 0.65));

  // 2. Five Gill Slits
  const gillGroup = new THREE.Group();
  gillGroup.position.set(0, 1.18, 0.42);
  const slitMat = makeMat(0xdc2626, 0.4);
  [-1, 1].forEach((s) => {
    for (let g = 0; g < 5; g++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.18, 0.025), slitMat);
      slit.position.set(s * 0.26, -0.02, 0.12 - g * 0.055);
      gillGroup.add(slit);
    }
  });
  root.add(gillGroup);
  reg.registerPart('gills', gillGroup, new THREE.Vector3(0.5, 0.15, 0.2));

  // 3. Squalene Liver & Skin Trunk
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 1.18, 0);
  const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.15, 14, 22), shellMat);
  trunk.rotation.x = Math.PI / 2;
  bodyGroup.add(trunk);
  reg.shellMeshes.push(trunk);
  const liver = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.58, 10, 14), makeMat(0xf59e0b, 0.35));
  liver.rotation.x = Math.PI / 2;
  liver.position.set(0, -0.04, 0.05);
  bodyGroup.add(liver);
  root.add(bodyGroup);
  reg.registerPart('liver_skin', bodyGroup, new THREE.Vector3(0, 0.55, 0));

  // 4. Dorsal & Wing Pectorals
  const finGroup = new THREE.Group();
  finGroup.position.set(0, 1.18, 0);
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.46, 6), sharkMat);
  dorsal.position.set(0, 0.44, 0.05);
  dorsal.rotation.x = -0.3;
  finGroup.add(dorsal);
  [-1, 1].forEach((s) => {
    const pect = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.028, 0.22), sharkMat);
    pect.position.set(s * 0.44, -0.14, 0.22);
    pect.rotation.y = -s * 0.38;
    finGroup.add(pect);
  });
  root.add(finGroup);
  reg.registerPart('dorsal_pectoral', finGroup, new THREE.Vector3(0, 0.65, 0));

  // 5. Crescent Heterocercal Tail
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 1.18, -0.86);
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.58, 6), sharkMat);
  upper.position.set(0, 0.24, -0.14);
  upper.rotation.x = -0.7;
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 6), sharkMat);
  lower.position.set(0, -0.16, -0.1);
  lower.rotation.x = Math.PI + 0.6;
  tailGroup.add(upper, lower);
  root.add(tailGroup);
  reg.registerPart('caudal', tailGroup, new THREE.Vector3(0, 0, -0.7));

  return finalize(root, reg, (elapsed) => {
    tailGroup.rotation.y = Math.sin(elapsed * 3.8) * 0.24;
  });
}

function buildMantaRay(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.7);
  const rayMat = makeMat(0x1e293b, 0.32);

  const cephGroup = new THREE.Group();
  cephGroup.position.set(0, 1.2, 0.52);
  [-1, 1].forEach((s) => {
    const horn = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.26, 6, 10), rayMat);
    horn.position.set(s * 0.24, -0.02, 0.14);
    horn.rotation.x = Math.PI / 2;
    cephGroup.add(horn);
  });
  root.add(cephGroup);
  reg.registerPart('cephalic_fins', cephGroup, new THREE.Vector3(0, 0.2, 0.65));

  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, 1.2, 0);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.08, 4), makeShellMat(0x0f172a, null, 0.5));
  disc.scale.set(1.35, 1, 0.72);
  wingGroup.add(disc);
  reg.shellMeshes.push(disc);
  root.add(wingGroup);
  reg.registerPart('pectoral_wings', wingGroup, new THREE.Vector3(0, 0.55, 0));

  const gillGroup = new THREE.Group();
  gillGroup.position.set(0, 1.12, 0.18);
  for (let g = 0; g < 5; g++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.03, 0.04), makeMat(0xef4444, 0.4));
    plate.position.set(0, 0, 0.14 - g * 0.07);
    gillGroup.add(plate);
  }
  root.add(gillGroup);
  reg.registerPart('gill_rakers', gillGroup, new THREE.Vector3(0, -0.45, 0.3));

  const brGroup = new THREE.Group();
  brGroup.position.set(0, 1.24, 0.32);
  brGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), makeMat(0x38bdf8, 0.3, null, 0x0369a1)));
  root.add(brGroup);
  reg.registerPart('brain_eyes', brGroup, new THREE.Vector3(0, 0.55, 0.35));

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 1.18, -0.68);
  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.035, 0.95, 8), rayMat);
  whip.rotation.x = Math.PI / 2;
  whip.position.z = -0.42;
  tailGroup.add(whip);
  root.add(tailGroup);
  reg.registerPart('tail', tailGroup, new THREE.Vector3(0, 0, -0.7));

  return finalize(root, reg, (elapsed) => {
    wingGroup.rotation.z = Math.sin(elapsed * 2.2) * 0.09;
    tailGroup.rotation.y = Math.sin(elapsed * 2.4) * 0.15;
  });
}

function buildSeahorse(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.45);
  const goldMat = makeMat(0xf59e0b, 0.45);

  const snoutGroup = new THREE.Group();
  snoutGroup.position.set(0, 1.98, 0.16);
  snoutGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), goldMat));
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 0.34, 10), goldMat);
  straw.rotation.x = Math.PI / 2;
  straw.position.set(0, -0.04, 0.24);
  snoutGroup.add(straw);
  root.add(snoutGroup);
  reg.registerPart('snout_eyes', snoutGroup, new THREE.Vector3(0, 0.55, 0.45));

  const armGroup = new THREE.Group();
  armGroup.position.set(0, 1.38, 0);
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.22), makeMat(0xfbbf24, 0.45));
    ring.position.set(0, 0.35 - i * 0.1, Math.sin(i * 0.35) * 0.08);
    armGroup.add(ring);
  }
  root.add(armGroup);
  reg.registerPart('armor_rings', armGroup, new THREE.Vector3(-0.45, 0.25, 0));

  const dorGroup = new THREE.Group();
  dorGroup.position.set(0, 1.35, -0.18);
  const fan = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.22), makeShellMat(0xbae6fd, null, 0.65));
  dorGroup.add(fan);
  root.add(dorGroup);
  reg.registerPart('dorsal_fin', dorGroup, new THREE.Vector3(0, 0.25, -0.6));

  const poGroup = new THREE.Group();
  poGroup.position.set(0, 1.12, 0.16);
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), makeMat(0xfb923c, 0.4));
  pouch.scale.set(0.9, 1.35, 0.85);
  poGroup.add(pouch);
  root.add(poGroup);
  reg.registerPart('brood_pouch', poGroup, new THREE.Vector3(0, 0.15, 0.6));

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.68, 0);
  const curlPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 2.2;
    const rad = 0.26 * (1 - t * 0.65);
    curlPts.push(new THREE.Vector3(0, -t * 0.22 + Math.sin(a) * rad * 0.6, Math.cos(a) * rad));
  }
  tailGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curlPts), 24, 0.055, 4, false), goldMat));
  root.add(tailGroup);
  reg.registerPart('tail', tailGroup, new THREE.Vector3(0, -0.45, 0));

  return finalize(root, reg, (elapsed) => {
    dorGroup.rotation.y = Math.sin(elapsed * 18) * 0.25;
  });
}

function buildCephalopod(isOctopus: boolean, maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  const skinColor = isOctopus ? 0xea580c : 0xf472b6;
  const solidMat = makeMat(skinColor, 0.35);
  const shellMat = makeShellMat(skinColor, null, 0.4);

  // 1. Mantle + Internal Hearts/Pen
  const manGroup = new THREE.Group();
  manGroup.position.set(0, 1.55, -0.08);
  const mantle = new THREE.Mesh(new THREE.CapsuleGeometry(isOctopus ? 0.36 : 0.24, isOctopus ? 0.32 : 0.88, 14, 20), shellMat);
  if (isOctopus) mantle.rotation.x = -0.35;
  manGroup.add(mantle);
  reg.shellMeshes.push(mantle);
  for (let h = -1; h <= 1; h++) {
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), makeMat(0x38bdf8, 0.3, null, 0x0284c7));
    heart.position.set(h * 0.14, h === 0 ? 0.08 : -0.04, 0);
    manGroup.add(heart);
  }
  root.add(manGroup);
  reg.registerPart(isOctopus ? 'mantle_hearts' : 'mantle_pen', manGroup, new THREE.Vector3(0, 0.65, 0));

  // 2. Head/Eyes or Stabilizer Fins
  const part2Group = new THREE.Group();
  if (isOctopus) {
    part2Group.position.set(0, 1.18, 0.15);
    part2Group.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), solidMat));
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), makeMat(0xfef08a, 0.15));
      eye.position.set(s * 0.18, 0.08, 0.14);
      part2Group.add(eye);
    });
    root.add(part2Group);
    reg.registerPart('head_eyes', part2Group, new THREE.Vector3(0, 0.3, 0.55));
  } else {
    part2Group.position.set(0, 2.02, -0.08);
    [-1, 1].forEach((s) => {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.38, 4), solidMat);
      fin.rotation.z = s * Math.PI / 2;
      fin.scale.y = 0.2;
      fin.position.set(s * 0.22, 0, 0);
      part2Group.add(fin);
    });
    root.add(part2Group);
    reg.registerPart('fins', part2Group, new THREE.Vector3(0, 0.72, 0));
  }

  // 3. Siphon / Eyes+Siphon
  const siphGroup = new THREE.Group();
  siphGroup.position.set(0, 1.18, -0.18);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.28, 12), solidMat);
  tube.rotation.x = -0.8;
  siphGroup.add(tube);
  if (!isOctopus) {
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), makeMat(0x38bdf8, 0.15));
      eye.position.set(s * 0.18, 0.02, 0.26);
      siphGroup.add(eye);
    });
  }
  root.add(siphGroup);
  reg.registerPart(isOctopus ? 'siphon' : 'eyes_siphon', siphGroup, new THREE.Vector3(0, 0.2, -0.6));

  // 4. 8 Sucker Arms
  const armGroup = new THREE.Group();
  armGroup.position.set(0, 0.92, 0.05);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pts = [
      new THREE.Vector3(Math.cos(a) * 0.14, 0.1, Math.sin(a) * 0.14),
      new THREE.Vector3(Math.cos(a) * 0.42, -0.25, Math.sin(a) * 0.42),
      new THREE.Vector3(Math.cos(a + 0.35) * 0.78, -0.62, Math.sin(a + 0.35) * 0.78),
    ];
    armGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.048, 8, false), solidMat));
  }
  root.add(armGroup);
  reg.registerPart('arms', armGroup, new THREE.Vector3(0, -0.5, 0));

  // 5. Chromatophore Skin / 2 Long Feeding Tentacles
  const fifthGroup = new THREE.Group();
  if (isOctopus) {
    fifthGroup.position.set(0, 1.48, 0.12);
    const spotMat = makeMat(0xfb7185, 0.35);
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), spotMat);
      s.position.set(Math.cos(i * 1.7) * 0.28, Math.sin(i * 2.3) * 0.2, Math.sin(i * 0.9) * 0.22);
      fifthGroup.add(s);
    }
    root.add(fifthGroup);
    reg.registerPart('skin_cells', fifthGroup, new THREE.Vector3(0.55, 0.35, 0.3));
  } else {
    fifthGroup.position.set(0, 0.92, 0.05);
    [-1, 1].forEach((s) => {
      const tPts = [
        new THREE.Vector3(s * 0.12, 0, 0.1),
        new THREE.Vector3(s * 0.35, -0.45, 0.35),
        new THREE.Vector3(s * 0.22, -0.78, 0.75),
      ];
      fifthGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tPts), 16, 0.028, 8, false), makeMat(0xbe185d, 0.35)));
    });
    root.add(fifthGroup);
    reg.registerPart('tentacles', fifthGroup, new THREE.Vector3(0, -0.45, 0.65));
  }

  return finalize(root, reg, (elapsed) => {
    armGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.12;
    manGroup.scale.set(1 + Math.sin(elapsed * 2.8) * 0.05, 1, 1 + Math.sin(elapsed * 2.8) * 0.05);
  });
}

function buildJellyfish(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const bellGroup = new THREE.Group();
  bellGroup.position.set(0, 1.72, 0);
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
    makeShellMat(0xbae6fd, null, 0.34)
  );
  bell.scale.y = 0.72;
  bellGroup.add(bell);
  reg.shellMeshes.push(bell);
  root.add(bellGroup);
  reg.registerPart('bell', bellGroup, new THREE.Vector3(0, 0.65, 0));

  const gonGroup = new THREE.Group();
  gonGroup.position.set(0, 1.85, 0);
  const gonMat = makeMat(0xe879f9, 0.3, null, 0x86198f);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const lobe = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 16), gonMat);
    lobe.rotation.x = Math.PI / 2;
    lobe.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
    gonGroup.add(lobe);
  }
  root.add(gonGroup);
  reg.registerPart('gonads', gonGroup, new THREE.Vector3(0, 0.45, 0.35));

  const oaGroup = new THREE.Group();
  oaGroup.position.set(0, 1.52, 0);
  const oaMat = makeMat(0xf472b6, 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const pts = [
      new THREE.Vector3(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14),
      new THREE.Vector3(Math.cos(a + 0.3) * 0.2, -0.48, Math.sin(a + 0.3) * 0.2),
      new THREE.Vector3(Math.cos(a) * 0.12, -0.98, Math.sin(a) * 0.12),
    ];
    oaGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.045, 8, false), oaMat));
  }
  root.add(oaGroup);
  reg.registerPart('oral_arms', oaGroup, new THREE.Vector3(-0.45, -0.35, 0));

  const tenGroup = new THREE.Group();
  tenGroup.position.set(0, 1.66, 0);
  const tMat = makeMat(0x7dd3fc, 0.3);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 1.15, 6), tMat);
    tent.position.set(Math.cos(a) * 0.72, -0.56, Math.sin(a) * 0.72);
    tenGroup.add(tent);
  }
  root.add(tenGroup);
  reg.registerPart('tentacles', tenGroup, new THREE.Vector3(0.45, -0.45, 0));

  const netGroup = new THREE.Group();
  netGroup.position.set(0, 1.72, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.018, 8, 32), makeMat(0x38bdf8, 0.3, null, 0x0369a1));
  ring.rotation.x = Math.PI / 2;
  netGroup.add(ring);
  root.add(netGroup);
  reg.registerPart('nerve_net', netGroup, new THREE.Vector3(0, 0.25, -0.45));

  return finalize(root, reg, (elapsed) => {
    const pulse = 1 + Math.sin(elapsed * 2.8) * 0.09;
    bellGroup.scale.set(pulse, 1 / Math.sqrt(pulse), pulse);
    oaGroup.rotation.y = elapsed * 0.25;
  });
}

function buildStarfish(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const madGroup = new THREE.Group();
  madGroup.position.set(0.12, 1.14, 0.08);
  madGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.06, 14), makeMat(0xfacc15, 0.35)));
  root.add(madGroup);
  reg.registerPart('madreporite', madGroup, new THREE.Vector3(0, 0.65, 0));

  const armGroup = new THREE.Group();
  armGroup.position.set(0, 1.0, 0);
  const armMat = makeShellMat(0xf97316, null, 0.45);
  const tfGroup = new THREE.Group();
  tfGroup.position.set(0, 0.85, 0);
  const tfMat = makeMat(0x38bdf8, 0.3);
  const ossGroup = new THREE.Group();
  ossGroup.position.set(0, 1.0, 0);
  const ossMat = makeMat(0xf5f0e1, 0.5);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.92, 12), armMat);
    arm.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
    arm.rotation.z = -Math.cos(a) * (Math.PI / 2);
    arm.rotation.x = Math.sin(a) * (Math.PI / 2);
    arm.scale.y = 0.55;
    armGroup.add(arm);
    reg.shellMeshes.push(arm);

    for (let k = 1; k <= 4; k++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), tfMat);
      f.position.set(Math.cos(a) * (k * 0.18), 0, Math.sin(a) * (k * 0.18));
      tfGroup.add(f);
      const o = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), ossMat);
      o.position.set(Math.cos(a) * (k * 0.18), 0.04, Math.sin(a) * (k * 0.18));
      ossGroup.add(o);
    }
  }
  root.add(armGroup, tfGroup, ossGroup);
  reg.registerPart('arms', armGroup, new THREE.Vector3(-0.5, 0.2, 0));
  reg.registerPart('tube_feet', tfGroup, new THREE.Vector3(0, -0.5, 0));
  reg.registerPart('ossicles', ossGroup, new THREE.Vector3(0.55, 0.3, 0));

  const stomGroup = new THREE.Group();
  stomGroup.position.set(0, 1.02, 0);
  stomGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), makeMat(0xf43f5e, 0.4)));
  root.add(stomGroup);
  reg.registerPart('stomach', stomGroup, new THREE.Vector3(0, 0.48, 0));

  return finalize(root, reg, (elapsed) => {
    tfGroup.children.forEach((t, i) => {
      t.rotation.x = Math.sin(elapsed * 4 + i) * 0.25;
    });
  });
}

function buildCrustacean(isCrab: boolean, maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  const shellColor = isCrab ? 0xef4444 : 0xb91c1c;
  const shellMat = makeShellMat(shellColor, null, 0.46);
  const solidMat = makeMat(shellColor, 0.32);

  // 1. Carapace / Cephalothorax
  const carGroup = new THREE.Group();
  carGroup.position.set(0, 1.08, 0);
  const body = isCrab
    ? new THREE.Mesh(new THREE.SphereGeometry(0.56, 22, 16), shellMat)
    : new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.65, 12, 18), shellMat);
  if (isCrab) body.scale.set(1.22, 0.48, 0.92);
  else body.rotation.x = Math.PI / 2;
  carGroup.add(body);
  reg.shellMeshes.push(body);
  addInternalHeartLungs(carGroup);
  root.add(carGroup);
  reg.registerPart(isCrab ? 'carapace' : 'cephalothorax', carGroup, new THREE.Vector3(0, 0.58, 0));

  // 2. Eyes & Antennae
  const antGroup = new THREE.Group();
  antGroup.position.set(0, 1.15, isCrab ? 0.48 : 0.6);
  [-1, 1].forEach((s) => {
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.14, 8), solidMat);
    stalk.position.set(s * 0.12, 0.08, 0);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, isCrab ? 0.24 : 0.72, 6), solidMat);
    ant.position.set(s * 0.18, 0.05, 0.24);
    ant.rotation.x = Math.PI / 2.2;
    ant.rotation.z = -s * 0.35;
    antGroup.add(stalk, ant);
  });
  root.add(antGroup);
  reg.registerPart(isCrab ? 'eyes_antennae' : 'antennae', antGroup, new THREE.Vector3(0, 0.35, 0.65));

  // 3. Cheliped Claws
  const clawGroup = new THREE.Group();
  clawGroup.position.set(0, 1.05, isCrab ? 0.45 : 0.52);
  [-1, 1].forEach((s) => {
    const claw = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 8, 12), solidMat);
    claw.position.set(s * 0.48, 0, 0.24);
    claw.rotation.x = Math.PI / 2;
    claw.rotation.z = s * 0.4;
    clawGroup.add(claw);
  });
  root.add(clawGroup);
  reg.registerPart(isCrab ? 'chelipeds' : 'claws', clawGroup, new THREE.Vector3(0, 0.25, 0.7));

  // 4. Walking Legs
  const legGroup = new THREE.Group();
  legGroup.position.set(0, 0.92, 0);
  for (let side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const zOff = (i - 1.5) * 0.2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.56, 8), solidMat);
      leg.position.set(side * 0.58, -0.08, zOff);
      leg.rotation.z = -side * 1.1;
      legGroup.add(leg);
    }
  }
  root.add(legGroup);
  reg.registerPart('walking_legs', legGroup, new THREE.Vector3(0, -0.45, 0));

  // 5. Swimmerets / Tail Fan
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.98, isCrab ? -0.45 : -0.62);
  for (let seg = 0; seg < 4; seg++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.28 - seg * 0.03, 0.14, 0.14), solidMat);
    s.position.set(0, -seg * 0.04, -seg * 0.12);
    tailGroup.add(s);
  }
  root.add(tailGroup);
  reg.registerPart(isCrab ? 'swimmerets' : 'tail_fan', tailGroup, new THREE.Vector3(0, 0, -0.7));

  return finalize(root, reg, (elapsed) => {
    clawGroup.rotation.y = Math.sin(elapsed * 2.2) * 0.1;
    antGroup.rotation.x = Math.sin(elapsed * 3.5) * 0.12;
  });
}

function buildNautilus(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const shGroup = new THREE.Group();
  shGroup.position.set(0, 1.38, -0.06);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.25, 16, 36, Math.PI * 1.6), makeShellMat(0xfef3c7, null, 0.45));
  shGroup.add(coil);
  reg.shellMeshes.push(coil);
  root.add(shGroup);
  reg.registerPart('shell_chambers', shGroup, new THREE.Vector3(0, 0.55, -0.35));

  const siphGroup = new THREE.Group();
  siphGroup.position.set(0, 1.38, -0.06);
  const tube = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 28, Math.PI * 1.4), makeMat(0xf59e0b, 0.35));
  siphGroup.add(tube);
  root.add(siphGroup);
  reg.registerPart('siphuncle', siphGroup, new THREE.Vector3(0.55, 0.4, 0));

  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0.32, 1.15, 0.28);
  hoodGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), makeMat(0x9a3412, 0.5)));
  hoodGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), makeMat(0x0f172a, 0.2)).translateX(0.18));
  root.add(hoodGroup);
  reg.registerPart('hood_eyes', hoodGroup, new THREE.Vector3(0.45, 0.3, 0.5));

  const tenGroup = new THREE.Group();
  tenGroup.position.set(0.42, 0.98, 0.38);
  const tMat = makeMat(0xfdba74, 0.4);
  for (let i = 0; i < 14; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 6), tMat);
    t.position.set(((i % 5) - 2) * 0.06, (Math.floor(i / 5) - 1) * 0.06, 0.16);
    t.rotation.x = Math.PI / 2;
    tenGroup.add(t);
  }
  root.add(tenGroup);
  reg.registerPart('tentacles', tenGroup, new THREE.Vector3(0, -0.35, 0.7));

  const hypGroup = new THREE.Group();
  hypGroup.position.set(0.18, 0.85, 0.22);
  hypGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.26, 10), makeMat(0xfb7185, 0.4)).rotateX(Math.PI / 2));
  root.add(hypGroup);
  reg.registerPart('hyponome', hypGroup, new THREE.Vector3(0, -0.5, 0.35));

  return finalize(root, reg, (elapsed) => {
    shGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.06;
  });
}

function buildSeaUrchin(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const spGroup = new THREE.Group();
  spGroup.position.set(0, 1.18, 0);
  const spMat = makeMat(0x581c87, 0.35);
  for (let i = 0; i < 36; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 36);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
    const spine = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.55, 6), spMat);
    spine.position.copy(dir).multiplyScalar(0.68);
    spine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    spGroup.add(spine);
  }
  root.add(spGroup);
  reg.registerPart('spines', spGroup, new THREE.Vector3(0, 0.65, 0));

  const testGroup = new THREE.Group();
  testGroup.position.set(0, 1.18, 0);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 18), makeShellMat(0xc084fc, null, 0.36));
  shell.scale.y = 0.72;
  testGroup.add(shell);
  reg.shellMeshes.push(shell);
  root.add(testGroup);
  reg.registerPart('test', testGroup, new THREE.Vector3(-0.5, 0.3, 0));

  const lanGroup = new THREE.Group();
  lanGroup.position.set(0, 0.92, 0);
  for (let t = 0; t < 5; t++) {
    const a = (t / 5) * Math.PI * 2;
    const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 6), makeMat(0xfef08a, 0.35));
    jaw.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08);
    jaw.rotation.x = Math.PI;
    lanGroup.add(jaw);
  }
  root.add(lanGroup);
  reg.registerPart('lantern', lanGroup, new THREE.Vector3(0, -0.5, 0));

  const tfGroup = new THREE.Group();
  tfGroup.position.set(0, 1.18, 0);
  const tfMat = makeMat(0x38bdf8, 0.3);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6), tfMat);
    f.position.set(Math.cos(a) * 0.56, 0, Math.sin(a) * 0.56);
    f.rotation.z = Math.PI / 2;
    f.rotation.y = -a;
    tfGroup.add(f);
  }
  root.add(tfGroup);
  reg.registerPart('tube_feet', tfGroup, new THREE.Vector3(0.55, 0, 0.45));

  const visGroup = new THREE.Group();
  visGroup.position.set(0, 1.24, 0);
  addInternalGut(visGroup, 0.85);
  root.add(visGroup);
  reg.registerPart('viscera', visGroup, new THREE.Vector3(0, 0.45, -0.45));

  return finalize(root, reg, (elapsed) => {
    lanGroup.rotation.y = elapsed * 0.6;
  });
}

function buildSnail(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const shGroup = new THREE.Group();
  shGroup.position.set(-0.08, 1.38, -0.1);
  const s1 = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.24, 16, 28), makeShellMat(0xd97706, null, 0.52));
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), makeMat(0x92400e, 0.45));
  s2.position.set(0.22, 0, 0);
  shGroup.add(s1, s2);
  reg.shellMeshes.push(s1);
  root.add(shGroup);
  reg.registerPart('shell', shGroup, new THREE.Vector3(0, 0.65, -0.3));

  const tenGroup = new THREE.Group();
  tenGroup.position.set(0, 1.06, 0.68);
  const bodyMat = makeMat(0xd6d3d1, 0.45);
  [-1, 1].forEach((s) => {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.34, 8), bodyMat);
    upper.position.set(s * 0.09, 0.16, 0.06);
    upper.rotation.z = -s * 0.25;
    upper.rotation.x = 0.3;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), makeMat(0x0f172a, 0.2));
    eye.position.set(s * 0.14, 0.32, 0.12);
    tenGroup.add(upper, eye);
  });
  root.add(tenGroup);
  reg.registerPart('tentacles', tenGroup, new THREE.Vector3(0, 0.35, 0.65));

  const radGroup = new THREE.Group();
  radGroup.position.set(0, 0.96, 0.64);
  radGroup.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 6, 10), makeMat(0xf43f5e, 0.35)).rotateX(Math.PI / 2));
  root.add(radGroup);
  reg.registerPart('radula', radGroup, new THREE.Vector3(0.45, 0.1, 0.65));

  const footGroup = new THREE.Group();
  footGroup.position.set(0, 0.88, 0.08);
  const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.08, 12, 18), bodyMat);
  foot.rotation.x = Math.PI / 2;
  foot.scale.y = 0.45;
  footGroup.add(foot);
  root.add(footGroup);
  reg.registerPart('foot', footGroup, new THREE.Vector3(0, -0.48, 0));

  const pneuGroup = new THREE.Group();
  pneuGroup.position.set(0.24, 1.24, 0.14);
  pneuGroup.add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 16), makeMat(0x38bdf8, 0.35)));
  root.add(pneuGroup);
  reg.registerPart('pneumostome', pneuGroup, new THREE.Vector3(0.55, 0.3, 0));

  return finalize(root, reg, (elapsed) => {
    tenGroup.rotation.x = Math.sin(elapsed * 1.8) * 0.1;
  });
}

function buildEarthworm(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);
  const wormMat = makeShellMat(0xf472b6, null, 0.46);
  const solidWorm = makeMat(0xe07a5f, 0.4);

  const proGroup = new THREE.Group();
  proGroup.position.set(0.92, 1.15, 0);
  proGroup.add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 12), solidWorm).rotateZ(-Math.PI / 2));
  root.add(proGroup);
  reg.registerPart('prostomium', proGroup, new THREE.Vector3(0.65, 0.25, 0));

  const heartGroup = new THREE.Group();
  heartGroup.position.set(0.55, 1.15, 0);
  const hMat = makeMat(0xdc2626, 0.3, null, 0x7f1d1d);
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 16), hMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = i * 0.075 - 0.14;
    heartGroup.add(ring);
  }
  root.add(heartGroup);
  reg.registerPart('hearts_crop', heartGroup, new THREE.Vector3(0.25, 0.55, 0.3));

  const clitGroup = new THREE.Group();
  clitGroup.position.set(0.24, 1.15, 0);
  clitGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.24, 18), makeMat(0xfde047, 0.45)).rotateZ(Math.PI / 2));
  root.add(clitGroup);
  reg.registerPart('clitellum', clitGroup, new THREE.Vector3(0, 0.55, -0.35));

  const segGroup = new THREE.Group();
  segGroup.position.set(-0.2, 1.15, 0);
  for (let s = 0; s < 14; s++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.045, 10, 18), wormMat);
    seg.rotation.y = Math.PI / 2;
    seg.position.x = (s - 6.5) * 0.13;
    segGroup.add(seg);
    reg.shellMeshes.push(seg);
  }
  root.add(segGroup);
  reg.registerPart('segments', segGroup, new THREE.Vector3(-0.45, 0.15, 0));

  const setGroup = new THREE.Group();
  setGroup.position.set(-0.2, 1.0, 0);
  const bMat = makeMat(0xfef08a, 0.4);
  for (let i = 0; i < 12; i++) {
    const br = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 5), bMat);
    br.position.set((i - 5.5) * 0.14, 0, (i % 2 === 0 ? 1 : -1) * 0.08);
    br.rotation.x = Math.PI;
    setGroup.add(br);
  }
  root.add(setGroup);
  reg.registerPart('setae', setGroup, new THREE.Vector3(0, -0.5, 0));

  return finalize(root, reg, (elapsed) => {
    segGroup.children.forEach((s, i) => {
      s.position.y = Math.sin(elapsed * 3.5 + i * 0.45) * 0.03;
    });
  });
}

function buildCoralPolyp(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.45);

  const calGroup = new THREE.Group();
  calGroup.position.set(0, 0.9, 0);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.44, 0.72, 18, 1, true), makeMat(0xf1f5f9, 0.7));
  calGroup.add(cup);
  root.add(calGroup);
  reg.registerPart('calyx', calGroup, new THREE.Vector3(-0.5, 0, 0));

  const tenGroup = new THREE.Group();
  tenGroup.position.set(0, 1.56, 0);
  const tMat = makeMat(0xfb7185, 0.35, null, 0x881337);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const tCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.34, -0.1, Math.sin(a) * 0.34),
      new THREE.Vector3(Math.cos(a) * 0.52, 0.35, Math.sin(a) * 0.52),
      new THREE.Vector3(Math.cos(a) * 0.65, 0.18, Math.sin(a) * 0.65),
    ]);
    tenGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tCurve, 12, 0.032, 8, false), tMat));
  }
  root.add(tenGroup);
  reg.registerPart('tentacles', tenGroup, new THREE.Vector3(0, 0.65, 0));

  const zooxGroup = new THREE.Group();
  zooxGroup.position.set(0, 1.38, 0);
  const zMat = makeMat(0xfacc15, 0.25, null, 0x854d0e);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const alg = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), zMat);
    alg.position.set(Math.cos(a) * 0.35, (i % 3) * 0.08, Math.sin(a) * 0.35);
    zooxGroup.add(alg);
  }
  root.add(zooxGroup);
  reg.registerPart('zooxanthellae', zooxGroup, new THREE.Vector3(0.45, 0.4, 0.35));

  const gasGroup = new THREE.Group();
  gasGroup.position.set(0, 1.0, 0);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.65, 16), makeShellMat(0xf472b6, null, 0.45));
  gasGroup.add(body);
  reg.shellMeshes.push(body);
  root.add(gasGroup);
  reg.registerPart('gastrovascular', gasGroup, new THREE.Vector3(0.45, 0.15, 0));

  const basGroup = new THREE.Group();
  basGroup.position.set(0, 0.38, 0);
  basGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.25, 18), makeMat(0xe2e8f0, 0.75)));
  root.add(basGroup);
  reg.registerPart('basal_plate', basGroup, new THREE.Vector3(0, -0.48, 0));

  return finalize(root, reg, (elapsed) => {
    tenGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.15;
  });
}

// ============================================================================
// 5. INSECTS & ARACHNIDS (13 SPECIES)
// ============================================================================

function buildInsect(cfg: {
  bodyColor: number;
  wingColor: number;
  hasLargeWings?: boolean;
  hasElytra?: boolean;
  hasHorn?: boolean;
  raptorial?: boolean;
  proboscis?: boolean;
  longHind?: boolean;
  petiole?: boolean;
  plumeAntennae?: boolean;
  mapIds: {
    head: string;
    wings: string;
    thorax: string;
    legs: string;
    abdomen: string;
  };
}, maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const eyeTex = createCompoundEyeTexture(maxAniso);
  const wingTex = createWingVeinTexture(maxAniso);
  reg.textures.push(eyeTex, wingTex);

  const chitinMat = makeMat(cfg.bodyColor, 0.32);
  const shellMat = makeShellMat(cfg.bodyColor, null, 0.45);
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: cfg.wingColor,
    map: wingTex,
    roughness: 0.25,
    transparent: true,
    opacity: cfg.hasLargeWings ? 0.85 : 0.62,
    side: THREE.DoubleSide,
  });

  // 1. Head / Eyes / Proboscis / Horn / Antennae
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.25, 0.56);
  headGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), chitinMat));
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), makeMat(0x7c2d12, 0.25, eyeTex));
    eye.position.set(s * 0.11, 0.03, 0.06);
    headGroup.add(eye);
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.plumeAntennae ? 0.035 : 0.006, 0.008, 0.34, 6),
      chitinMat
    );
    ant.position.set(s * 0.08, 0.18, 0.16);
    ant.rotation.x = 0.6;
    ant.rotation.z = -s * 0.35;
    headGroup.add(ant);
  });
  if (cfg.proboscis) {
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.42, 6), makeMat(0x0f172a, 0.3));
    needle.position.set(0, -0.1, 0.26);
    needle.rotation.x = Math.PI / 2.3;
    headGroup.add(needle);
  }
  if (cfg.hasHorn) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.52, 10), chitinMat);
    horn.position.set(0, 0.18, 0.26);
    horn.rotation.x = 0.72;
    headGroup.add(horn);
  }
  root.add(headGroup);
  reg.registerPart(cfg.mapIds.head, headGroup, new THREE.Vector3(0, 0.35, 0.65));

  // 2. Wings / Elytra
  const wingGroup = new THREE.Group();
  wingGroup.position.set(0, 1.32, 0.12);
  [-1, 1].forEach((s) => {
    if (cfg.hasElytra) {
      const elytra = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 16, 12, 0, Math.PI, 0, Math.PI),
        makeMat(cfg.wingColor, 0.25)
      );
      elytra.scale.set(0.65, 0.45, 1.45);
      elytra.position.set(s * 0.18, 0.08, -0.12);
      elytra.rotation.y = s * 0.35;
      wingGroup.add(elytra);
    } else {
      const span = cfg.hasLargeWings ? 0.92 : 0.62;
      const fore = new THREE.Mesh(new THREE.BoxGeometry(span, 0.012, cfg.hasLargeWings ? 0.52 : 0.2), wingMat);
      fore.position.set(s * (span * 0.54), 0.04, -0.05);
      fore.rotation.y = -s * 0.2;
      wingGroup.add(fore);
    }
  });
  root.add(wingGroup);
  reg.registerPart(cfg.mapIds.wings, wingGroup, new THREE.Vector3(0, 0.68, 0));

  // 3. Thorax / Prothorax
  const thGroup = new THREE.Group();
  thGroup.position.set(0, 1.2, 0.22);
  const th = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, cfg.raptorial ? 0.48 : 0.24, 12, 16),
    shellMat
  );
  th.rotation.x = Math.PI / 2;
  thGroup.add(th);
  reg.shellMeshes.push(th);
  root.add(thGroup);
  reg.registerPart(cfg.mapIds.thorax, thGroup, new THREE.Vector3(0, 0.35, 0.2));

  // 4. 6 Jointed Legs
  const legGroup = new THREE.Group();
  legGroup.position.set(0, 1.04, 0.18);
  for (let side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const isHind = i === 2 && cfg.longHind;
      const isFront = i === 0 && cfg.raptorial;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.012, isHind ? 0.68 : isFront ? 0.54 : 0.38, 6),
        chitinMat
      );
      leg.position.set(side * 0.26, -0.08, (1 - i) * 0.16);
      leg.rotation.z = -side * 0.85;
      if (isFront) leg.position.z += 0.25;
      legGroup.add(leg);
    }
  }
  root.add(legGroup);
  reg.registerPart(cfg.mapIds.legs, legGroup, new THREE.Vector3(0, -0.5, 0));

  // 5. Abdomen / Gaster / Petiole
  const abdGroup = new THREE.Group();
  abdGroup.position.set(0, 1.15, -0.34);
  const abd = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.52, 12, 18), chitinMat);
  abd.rotation.x = Math.PI / 2;
  if (cfg.petiole) {
    const waist = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), chitinMat);
    waist.position.z = 0.35;
    abdGroup.add(waist);
  }
  abdGroup.add(abd);
  root.add(abdGroup);
  reg.registerPart(cfg.mapIds.abdomen, abdGroup, new THREE.Vector3(0, 0.1, -0.68));

  return finalize(root, reg, (elapsed) => {
    if (!cfg.hasElytra) {
      wingGroup.children.forEach((w, i) => {
        w.rotation.z = (i === 0 ? 1 : -1) * Math.sin(elapsed * (cfg.hasLargeWings ? 6 : 16)) * 0.2;
      });
    }
  });
}

function buildArachnidOrCentipede(
  variant: 'spider' | 'scorpion' | 'centipede',
  maxAniso: number
): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.6);

  const chitinMat = makeMat(variant === 'scorpion' ? 0x92400e : variant === 'centipede' ? 0x991b1b : 0x1e293b, 0.35);

  if (variant === 'spider') {
    const cepGroup = new THREE.Group();
    cepGroup.position.set(0, 1.12, 0.25);
    cepGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), chitinMat));
    root.add(cepGroup);
    reg.registerPart('cephalothorax', cepGroup, new THREE.Vector3(0, 0.45, 0.4));

    const legGroup = new THREE.Group();
    legGroup.position.set(0, 1.05, 0.2);
    for (let s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.72, 6), chitinMat);
        leg.position.set(s * 0.48, -0.05, (i - 1.5) * 0.16);
        leg.rotation.z = -s * 0.9;
        legGroup.add(leg);
      }
    }
    root.add(legGroup);
    reg.registerPart('legs', legGroup, new THREE.Vector3(0, -0.48, 0));

    const abdGroup = new THREE.Group();
    abdGroup.position.set(0, 1.18, -0.32);
    abdGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 16), makeShellMat(0x0f172a, null, 0.5)));
    root.add(abdGroup);
    reg.registerPart('abdomen', abdGroup, new THREE.Vector3(0, 0.35, -0.55));

    const spinGroup = new THREE.Group();
    spinGroup.position.set(0, 1.08, -0.68);
    [-1, 1].forEach((s) => {
      spinGroup.add(new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.12, 6), makeMat(0xf8fafc, 0.4)).translateX(s * 0.06).rotateX(-Math.PI / 2));
    });
    root.add(spinGroup);
    reg.registerPart('spinnerets', spinGroup, new THREE.Vector3(0, 0, -0.75));

    const pedGroup = new THREE.Group();
    pedGroup.position.set(0, 1.08, 0.52);
    [-1, 1].forEach((s) => {
      pedGroup.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.18, 6, 8), chitinMat).translateX(s * 0.14).rotateX(Math.PI / 2));
    });
    root.add(pedGroup);
    reg.registerPart('pedipalps', pedGroup, new THREE.Vector3(0, 0.2, 0.65));

    return finalize(root, reg, (elapsed) => {
      abdGroup.position.y = 1.18 + Math.sin(elapsed * 2) * 0.02;
    });
  }

  if (variant === 'scorpion') {
    const pedGroup = new THREE.Group();
    pedGroup.position.set(0, 1.05, 0.56);
    [-1, 1].forEach((s) => {
      const claw = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 8, 12), chitinMat);
      claw.position.set(s * 0.36, 0, 0.22);
      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = s * 0.35;
      pedGroup.add(claw);
    });
    root.add(pedGroup);
    reg.registerPart('pedipalps', pedGroup, new THREE.Vector3(0, 0.25, 0.7));

    const cepGroup = new THREE.Group();
    cepGroup.position.set(0, 1.06, 0.18);
    cepGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.38), chitinMat));
    root.add(cepGroup);
    reg.registerPart('cephalothorax', cepGroup, new THREE.Vector3(0, 0.45, 0.25));

    const legGroup = new THREE.Group();
    legGroup.position.set(0, 0.94, 0.1);
    for (let s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.48, 6), chitinMat);
        leg.position.set(s * 0.34, -0.05, (i - 1.5) * 0.12);
        leg.rotation.z = -s * 0.95;
        legGroup.add(leg);
      }
    }
    root.add(legGroup);
    reg.registerPart('legs_pectines', legGroup, new THREE.Vector3(0, -0.45, 0));

    const metGroup = new THREE.Group();
    metGroup.position.set(0, 1.28, -0.35);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.2, 0.15),
      new THREE.Vector3(0, 0.08, -0.32),
      new THREE.Vector3(0, 0.48, -0.15),
      new THREE.Vector3(0, 0.56, 0.14),
    ]);
    metGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 20, 0.055, 10, false), chitinMat));
    root.add(metGroup);
    reg.registerPart('metasoma', metGroup, new THREE.Vector3(0, 0.4, -0.55));

    const telGroup = new THREE.Group();
    telGroup.position.set(0, 1.84, -0.16);
    telGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), makeMat(0xf59e0b, 0.3)));
    const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.16, 8), makeMat(0x0f172a, 0.2));
    stinger.position.set(0, -0.04, 0.1);
    stinger.rotation.x = Math.PI / 2;
    telGroup.add(stinger);
    root.add(telGroup);
    reg.registerPart('telson', telGroup, new THREE.Vector3(0, 0.72, 0.2));

    return finalize(root, reg, (elapsed) => {
      telGroup.position.y = 1.84 + Math.sin(elapsed * 2.5) * 0.03;
    });
  }

  // Centipede
  const forcGroup = new THREE.Group();
  forcGroup.position.set(0, 1.05, 0.92);
  [-1, 1].forEach((s) => {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.14, 6), makeMat(0x0f172a, 0.2));
    fang.position.set(s * 0.08, -0.02, 0.1);
    fang.rotation.x = Math.PI / 2;
    forcGroup.add(fang);
  });
  root.add(forcGroup);
  reg.registerPart('forcipules', forcGroup, new THREE.Vector3(0, 0.25, 0.7));

  const hdGroup = new THREE.Group();
  hdGroup.position.set(0, 1.06, 0.78);
  hdGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), chitinMat));
  root.add(hdGroup);
  reg.registerPart('head', hdGroup, new THREE.Vector3(0, 0.45, 0.55));

  const bpGroup = new THREE.Group();
  bpGroup.position.set(0, 1.05, 0);
  for (let s = 0; s < 12; s++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.13), chitinMat);
    plate.position.set(Math.sin(s * 0.45) * 0.08, 0, 0.65 - s * 0.13);
    bpGroup.add(plate);
  }
  root.add(bpGroup);
  reg.registerPart('body_plates', bpGroup, new THREE.Vector3(0, 0.55, 0));

  const legGroup = new THREE.Group();
  legGroup.position.set(0, 0.98, 0);
  for (let side of [-1, 1]) {
    for (let s = 0; s < 11; s++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.28, 6), makeMat(0xf59e0b, 0.4));
      leg.position.set(side * 0.22 + Math.sin(s * 0.45) * 0.08, -0.04, 0.6 - s * 0.13);
      leg.rotation.z = -side * 1.1;
      legGroup.add(leg);
    }
  }
  root.add(legGroup);
  reg.registerPart('legs', legGroup, new THREE.Vector3(0, -0.48, 0));

  const tlGroup = new THREE.Group();
  tlGroup.position.set(0, 1.04, -0.92);
  [-1, 1].forEach((s) => {
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.34, 6), chitinMat);
    tl.position.set(s * 0.1, 0, -0.15);
    tl.rotation.x = Math.PI / 2;
    tl.rotation.z = s * 0.35;
    tlGroup.add(tl);
  });
  root.add(tlGroup);
  reg.registerPart('tail_legs', tlGroup, new THREE.Vector3(0, 0.15, -0.7));

  return finalize(root, reg, (elapsed) => {
    legGroup.children.forEach((l, i) => {
      l.rotation.y = Math.sin(elapsed * 8 + i * 0.5) * 0.18;
    });
  });
}

// ============================================================================
// MASTER 65-ANIMAL DISPATCHER
// ============================================================================

export function buildAnimalOrArthropodSpecimen(
  id: string,
  maxAniso: number
): SpecimenBuildResult | null {
  switch (id) {
    // --- 16 MAMMALS ---
    case 'lion':
      return buildQuadrupedMammal({
        bodyColor: 0xd97706, baseHex: '#d97706', accentHex: '#92400e', pattern: 'solid',
        torsoR: 0.34, torsoLen: 0.95, bodyY: 1.05, neckLen: 0.32, neckTilt: 0.5, snoutLen: 0.2,
        earSize: [0.06, 0.08], legLen: 0.72, tailLen: 0.85, mane: true,
        mapIds: { head: 'head', thorax: 'thorax', limbs: 'limbs', organOrFeature: 'viscera', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'elephant':
      return buildQuadrupedMammal({
        bodyColor: 0x64748b, baseHex: '#64748b', accentHex: '#475569', pattern: 'solid',
        torsoR: 0.54, torsoLen: 1.05, bodyY: 1.24, neckLen: 0.25, neckTilt: 0.65, snoutLen: 0.18,
        earSize: [0.42, 0.52], legLen: 0.85, tailLen: 0.55, trunkTusks: true,
        mapIds: { head: 'trunk', thorax: 'torso', limbs: 'limbs', organOrFeature: 'tusks', tailOrExtra: 'ears' },
      }, maxAniso);
    case 'blue_whale':
      return buildCetacean(true, maxAniso);
    case 'dolphin':
      return buildCetacean(false, maxAniso);
    case 'bat':
      return buildBat(maxAniso);
    case 'giraffe':
      return buildQuadrupedMammal({
        bodyColor: 0xfacc15, baseHex: '#facc15', accentHex: '#92400e', pattern: 'spots',
        torsoR: 0.32, torsoLen: 0.85, bodyY: 1.18, neckLen: 1.18, neckTilt: 0.25, snoutLen: 0.24,
        earSize: [0.06, 0.1], legLen: 0.96, tailLen: 0.65, horns: true,
        mapIds: { head: 'head_ossicones', thorax: 'neck', limbs: 'legs', organOrFeature: 'heart_thorax', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'kangaroo':
      return buildQuadrupedMammal({
        bodyColor: 0xb45309, baseHex: '#b45309', accentHex: '#78350f', pattern: 'solid',
        torsoR: 0.3, torsoLen: 0.78, bodyY: 1.1, neckLen: 0.32, neckTilt: 0.35, snoutLen: 0.2,
        earSize: [0.055, 0.22], legLen: 0.52, hindBoost: 1.45, tailLen: 1.05, pouch: true,
        mapIds: { head: 'head', thorax: 'pouch', limbs: 'hind_legs', organOrFeature: 'thorax', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'camel':
      return buildQuadrupedMammal({
        bodyColor: 0xd97706, baseHex: '#d97706', accentHex: '#b45309', pattern: 'solid',
        torsoR: 0.35, torsoLen: 0.95, bodyY: 1.18, neckLen: 0.65, neckTilt: 0.55, snoutLen: 0.22,
        earSize: [0.045, 0.08], legLen: 0.9, tailLen: 0.45, humps: true, hooves: true,
        mapIds: { head: 'head', thorax: 'humps', limbs: 'feet', organOrFeature: 'viscera', tailOrExtra: 'neck_tail' },
      }, maxAniso);
    case 'polar_bear':
      return buildQuadrupedMammal({
        bodyColor: 0xf1f5f9, baseHex: '#f1f5f9', accentHex: '#cbd5e1', pattern: 'solid',
        torsoR: 0.42, torsoLen: 1.0, bodyY: 1.08, neckLen: 0.28, neckTilt: 0.72, snoutLen: 0.26,
        earSize: [0.055, 0.06], legLen: 0.72, tailLen: 0.22,
        mapIds: { head: 'head', thorax: 'coat_skin', limbs: 'paws', organOrFeature: 'torso', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'cheetah':
      return buildQuadrupedMammal({
        bodyColor: 0xfbbf24, baseHex: '#fbbf24', accentHex: '#1e293b', pattern: 'spots',
        torsoR: 0.26, torsoLen: 0.98, bodyY: 1.05, neckLen: 0.3, neckTilt: 0.52, snoutLen: 0.16,
        earSize: [0.05, 0.07], legLen: 0.78, tailLen: 0.95,
        mapIds: { head: 'head', thorax: 'spine', limbs: 'paws', organOrFeature: 'thorax', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'wolf':
      return buildQuadrupedMammal({
        bodyColor: 0x94a3b8, baseHex: '#94a3b8', accentHex: '#334155', pattern: 'solid',
        torsoR: 0.28, torsoLen: 0.88, bodyY: 1.0, neckLen: 0.28, neckTilt: 0.55, snoutLen: 0.26,
        earSize: [0.055, 0.14], legLen: 0.72, tailLen: 0.58,
        mapIds: { head: 'head', thorax: 'thorax', limbs: 'limbs', organOrFeature: 'viscera', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'horse':
      return buildQuadrupedMammal({
        bodyColor: 0x78350f, baseHex: '#78350f', accentHex: '#451a03', pattern: 'solid',
        torsoR: 0.35, torsoLen: 1.02, bodyY: 1.18, neckLen: 0.62, neckTilt: 0.48, snoutLen: 0.34,
        earSize: [0.045, 0.13], legLen: 0.88, tailLen: 0.78, hooves: true, mane: true,
        mapIds: { head: 'head', thorax: 'thorax', limbs: 'hooves', organOrFeature: 'hindgut', tailOrExtra: 'mane_tail' },
      }, maxAniso);
    case 'cow':
      return buildQuadrupedMammal({
        bodyColor: 0xf8fafc, baseHex: '#f8fafc', accentHex: '#1e293b', pattern: 'spots',
        torsoR: 0.4, torsoLen: 1.02, bodyY: 1.12, neckLen: 0.35, neckTilt: 0.75, snoutLen: 0.24,
        earSize: [0.065, 0.14], legLen: 0.76, tailLen: 0.68, horns: true, udder: true, hooves: true,
        mapIds: { head: 'head', thorax: 'rumen', limbs: 'hooves', organOrFeature: 'udder', tailOrExtra: 'thorax' },
      }, maxAniso);
    case 'rabbit':
      return buildQuadrupedMammal({
        bodyColor: 0xd6d3d1, baseHex: '#d6d3d1', accentHex: '#a8a29e', pattern: 'solid',
        torsoR: 0.28, torsoLen: 0.48, bodyY: 0.88, neckLen: 0.16, neckTilt: 0.5, snoutLen: 0.14,
        earSize: [0.1, 0.38], legLen: 0.38, hindBoost: 1.38, tailLen: 0.14,
        mapIds: { head: 'teeth', thorax: 'cecum', limbs: 'hind_legs', organOrFeature: 'ears', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'platypus':
      return buildQuadrupedMammal({
        bodyColor: 0x78350f, baseHex: '#78350f', accentHex: '#451a03', pattern: 'solid',
        torsoR: 0.25, torsoLen: 0.78, bodyY: 0.78, neckLen: 0.12, neckTilt: 0.9, snoutLen: 0.28,
        earSize: [0.01, 0.01], legLen: 0.28, tailLen: 0.62, duckBill: true,
        mapIds: { head: 'bill', thorax: 'torso', limbs: 'spur', organOrFeature: 'forepaws', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'chimpanzee':
      return buildChimpanzee(maxAniso);

    // --- 10 BIRDS ---
    case 'eagle':
      return buildBird({
        bodyColor: 0x78350f, baseHex: '#78350f', accentHex: '#451a03', torsoR: 0.24, torsoLen: 0.44,
        bodyY: 1.15, neckLen: 0.2, beakLen: 0.16, beakStyle: 'hook', wingSpan: 0.92, legLen: 0.42, tailType: 'fan',
        mapIds: { head: 'head', wings: 'wings', core: 'lungs', legs: 'talons', tailOrExtra: 'tail' },
      }, maxAniso);
    case 'penguin':
      return buildBird({
        bodyColor: 0x0f172a, baseHex: '#0f172a', accentHex: '#f8fafc', torsoR: 0.28, torsoLen: 0.56,
        bodyY: 1.05, neckLen: 0.18, beakLen: 0.16, beakStyle: 'cone', wingSpan: 0.45, legLen: 0.24, tailType: 'short',
        mapIds: { head: 'head', wings: 'flippers', core: 'plumage', legs: 'feet', tailOrExtra: 'brood' },
      }, maxAniso);
    case 'hummingbird':
      return buildBird({
        bodyColor: 0x10b981, baseHex: '#10b981', accentHex: '#34d399', torsoR: 0.16, torsoLen: 0.28,
        bodyY: 1.28, neckLen: 0.14, beakLen: 0.36, beakStyle: 'needle', wingSpan: 0.52, legLen: 0.14, tailType: 'fan',
        mapIds: { head: 'beak_tongue', wings: 'wings', core: 'heart_pectoral', legs: 'tail_feet', tailOrExtra: 'plumage' },
      }, maxAniso);
    case 'owl':
      return buildBird({
        bodyColor: 0x92400e, baseHex: '#92400e', accentHex: '#fde68a', torsoR: 0.26, torsoLen: 0.44,
        bodyY: 1.15, neckLen: 0.16, beakLen: 0.09, beakStyle: 'hook', wingSpan: 0.85, legLen: 0.36, tailType: 'short', facialDisc: true,
        mapIds: { head: 'facial_disc', wings: 'wings', core: 'neck', legs: 'talons', tailOrExtra: 'digestive' },
      }, maxAniso);
    case 'ostrich':
      return buildBird({
        bodyColor: 0x1e293b, baseHex: '#1e293b', accentHex: '#f8fafc', torsoR: 0.36, torsoLen: 0.55,
        bodyY: 1.25, neckLen: 0.85, beakLen: 0.16, beakStyle: 'flat', wingSpan: 0.42, legLen: 0.92, tailType: 'fan',
        mapIds: { head: 'head', wings: 'wings_plumage', core: 'neck', legs: 'legs', tailOrExtra: 'viscera' },
      }, maxAniso);
    case 'flamingo':
      return buildBird({
        bodyColor: 0xfb7185, baseHex: '#fb7185', accentHex: '#f43f5e', torsoR: 0.22, torsoLen: 0.42,
        bodyY: 1.32, neckLen: 0.82, beakLen: 0.2, beakStyle: 'downcurve', wingSpan: 0.72, legLen: 0.96, tailType: 'short',
        mapIds: { head: 'bill', wings: 'wings', core: 'neck', legs: 'legs', tailOrExtra: 'plumage' },
      }, maxAniso);
    case 'peacock':
      return buildBird({
        bodyColor: 0x1d4ed8, baseHex: '#1d4ed8', accentHex: '#2dd4bf', torsoR: 0.24, torsoLen: 0.48,
        bodyY: 1.15, neckLen: 0.45, beakLen: 0.12, beakStyle: 'cone', wingSpan: 0.55, legLen: 0.48, tailType: 'peacock', crest: true,
        mapIds: { head: 'head_crest', wings: 'wings', core: 'viscera', legs: 'legs_spurs', tailOrExtra: 'train' },
      }, maxAniso);
    case 'pigeon':
      return buildBird({
        bodyColor: 0x94a3b8, baseHex: '#94a3b8', accentHex: '#475569', torsoR: 0.22, torsoLen: 0.38,
        bodyY: 1.08, neckLen: 0.2, beakLen: 0.11, beakStyle: 'cone', wingSpan: 0.68, legLen: 0.28, tailType: 'fan',
        mapIds: { head: 'head', wings: 'wings', core: 'crop', legs: 'tail_feet', tailOrExtra: 'skeleton' },
      }, maxAniso);
    case 'pelican':
      return buildBird({
        bodyColor: 0xf1f5f9, baseHex: '#f1f5f9', accentHex: '#cbd5e1', torsoR: 0.28, torsoLen: 0.52,
        bodyY: 1.15, neckLen: 0.42, beakLen: 0.42, beakStyle: 'pouch', wingSpan: 0.95, legLen: 0.34, tailType: 'short',
        mapIds: { head: 'pouch', wings: 'wings', core: 'chest_air', legs: 'feet', tailOrExtra: 'head' },
      }, maxAniso);
    case 'duck':
      return buildBird({
        bodyColor: 0x78350f, baseHex: '#78350f', accentHex: '#16a34a', torsoR: 0.24, torsoLen: 0.46,
        bodyY: 0.95, neckLen: 0.24, beakLen: 0.19, beakStyle: 'flat', wingSpan: 0.62, legLen: 0.24, tailType: 'short',
        mapIds: { head: 'bill', wings: 'wings', core: 'plumage', legs: 'feet', tailOrExtra: 'viscera' },
      }, maxAniso);

    // --- 12 REPTILES & AMPHIBIANS ---
    case 'sea_turtle':
      return buildTurtleSpecies(true, maxAniso);
    case 'tortoise':
      return buildTurtleSpecies(false, maxAniso);
    case 'cobra':
      return buildCobra(maxAniso);
    case 'crocodile':
      return buildLizardOrCroco('crocodile', maxAniso);
    case 'chameleon':
      return buildLizardOrCroco('chameleon', maxAniso);
    case 'komodo_dragon':
      return buildLizardOrCroco('komodo_dragon', maxAniso);
    case 'iguana':
      return buildLizardOrCroco('iguana', maxAniso);
    case 'frog':
      return buildAmphibian('frog', maxAniso);
    case 'axolotl':
      return buildAmphibian('axolotl', maxAniso);
    case 'salamander':
      return buildAmphibian('salamander', maxAniso);
    case 'dart_frog':
      return buildAmphibian('dart_frog', maxAniso);
    case 'toad':
      return buildAmphibian('toad', maxAniso);

    // --- 14 FISH & MARINE ---
    case 'shark':
      return buildShark(maxAniso);
    case 'manta_ray':
      return buildMantaRay(maxAniso);
    case 'seahorse':
      return buildSeahorse(maxAniso);
    case 'octopus':
      return buildCephalopod(true, maxAniso);
    case 'squid':
      return buildCephalopod(false, maxAniso);
    case 'jellyfish':
      return buildJellyfish(maxAniso);
    case 'starfish':
      return buildStarfish(maxAniso);
    case 'crab':
      return buildCrustacean(true, maxAniso);
    case 'lobster':
      return buildCrustacean(false, maxAniso);
    case 'nautilus':
      return buildNautilus(maxAniso);
    case 'sea_urchin':
      return buildSeaUrchin(maxAniso);
    case 'snail':
      return buildSnail(maxAniso);
    case 'earthworm':
      return buildEarthworm(maxAniso);
    case 'coral_polyp':
      return buildCoralPolyp(maxAniso);

    // --- 13 INSECTS & ARACHNIDS ---
    case 'butterfly':
      return buildInsect({
        bodyColor: 0x1e293b, wingColor: 0xf97316, hasLargeWings: true, proboscis: true,
        mapIds: { head: 'head', wings: 'wings', thorax: 'thorax', legs: 'legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'dragonfly':
      return buildInsect({
        bodyColor: 0x0ea5e9, wingColor: 0xbae6fd,
        mapIds: { head: 'eyes', wings: 'wings', thorax: 'thorax', legs: 'legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'praying_mantis':
      return buildInsect({
        bodyColor: 0x22c55e, wingColor: 0x4ade80, raptorial: true,
        mapIds: { head: 'head', wings: 'wings', thorax: 'prothorax', legs: 'raptorial_legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'ant':
      return buildInsect({
        bodyColor: 0x991b1b, wingColor: 0xe2e8f0, petiole: true,
        mapIds: { head: 'head', wings: 'petiole', thorax: 'thorax', legs: 'legs', abdomen: 'gaster' },
      }, maxAniso);
    case 'ladybug':
      return buildInsect({
        bodyColor: 0x0f172a, wingColor: 0xdc2626, hasElytra: true,
        mapIds: { head: 'head_pronotum', wings: 'elytra', thorax: 'hindwings', legs: 'legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'mosquito':
      return buildInsect({
        bodyColor: 0x475569, wingColor: 0xe2e8f0, proboscis: true,
        mapIds: { head: 'proboscis', wings: 'wings_halteres', thorax: 'antennae_palps', legs: 'legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'grasshopper':
      return buildInsect({
        bodyColor: 0x4d7c0f, wingColor: 0x84cc16, longHind: true,
        mapIds: { head: 'head', wings: 'wings', thorax: 'thorax', legs: 'hind_legs', abdomen: 'abdomen_tympanum' },
      }, maxAniso);
    case 'rhino_beetle':
      return buildInsect({
        bodyColor: 0x451a03, wingColor: 0x78350f, hasElytra: true, hasHorn: true,
        mapIds: { head: 'horn', wings: 'elytra', thorax: 'pronotum', legs: 'legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'silkmoth':
      return buildInsect({
        bodyColor: 0xfef3c7, wingColor: 0xf8fafc, hasLargeWings: true, plumeAntennae: true,
        mapIds: { head: 'antennae', wings: 'wings', thorax: 'head_thorax', legs: 'legs', abdomen: 'abdomen' },
      }, maxAniso);
    case 'housefly':
      return buildInsect({
        bodyColor: 0x334155, wingColor: 0xcbd5e1, proboscis: true,
        mapIds: { head: 'eyes', wings: 'wings_halteres', thorax: 'proboscis', legs: 'feet', abdomen: 'abdomen' },
      }, maxAniso);
    case 'spider':
      return buildArachnidOrCentipede('spider', maxAniso);
    case 'scorpion':
      return buildArachnidOrCentipede('scorpion', maxAniso);
    case 'centipede':
      return buildArachnidOrCentipede('centipede', maxAniso);

    default:
      return null;
  }
}
