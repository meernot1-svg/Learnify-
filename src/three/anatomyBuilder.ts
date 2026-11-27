import * as THREE from 'three';
import { OrganismId } from '../data/livingAnatomyData';
import { buildHumanSpecializedOrgan } from './humanOrganBuilders';
import { buildMicrobeOrPlantSpecimen } from './microbeAndPlantBuilders';
import { buildAnimalOrArthropodSpecimen } from './animalVertebrateArthropodBuilders';

export interface InteractivePartEntry {
  partId: string;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  baseEmissiveMap: WeakMap<THREE.Mesh, THREE.Color>;
  baseOpacityMap: WeakMap<THREE.Mesh, number>;
  baseTransparentMap: WeakMap<THREE.Mesh, boolean>;
  baseDepthWriteMap: WeakMap<THREE.Mesh, boolean>;
}

export interface SpecimenBuildResult {
  root: THREE.Group;
  parts: Map<string, InteractivePartEntry>;
  clickableMeshes: THREE.Mesh[];
  shellMeshes: THREE.Mesh[];
  textures: THREE.Texture[];
  updateAnimation: (elapsed: number, delta: number) => void;
}

// Module-scope scratch math helpers (zero GC inside animation loops)
const _animDummy = new THREE.Object3D();
const _animPt = new THREE.Vector3();
const _animTan = new THREE.Vector3();

// ---------- Procedural CanvasTexture Generators (Zero external assets) ----------

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function createRadialShadowTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.62)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createPedestalRingTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle brushed concentric bands
  for (let r = 20; r < 248; r += 18) {
    ctx.strokeStyle = r % 54 === 0 ? 'rgba(148, 163, 184, 0.22)' : 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = r % 54 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Degree tick marks around outer bezel
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const inner = i % 6 === 0 ? 226 : 236;
    const outer = 246;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * inner, 256 + Math.sin(a) * inner);
    ctx.lineTo(256 + Math.cos(a) * outer, 256 + Math.sin(a) * outer);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createBrainBumpTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#999999';
  ctx.fillRect(0, 0, 256, 256);

  ctx.lineCap = 'round';
  for (let i = 0; i < 42; i++) {
    const x0 = (i * 53) % 256;
    const y0 = (i * 97) % 256;
    ctx.strokeStyle = i % 2 === 0 ? '#3a3a3a' : '#dedede';
    ctx.lineWidth = 4 + (i % 3) * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(
      (x0 + 35) % 256,
      (y0 - 28 + 256) % 256,
      (x0 + 70) % 256,
      (y0 + 32) % 256,
      (x0 + 102) % 256,
      (y0 + 8) % 256
    );
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createTissueMicroTexture(maxAniso: number, baseTone = '#8a8a8a'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = baseTone;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle organic capillary web & cellular lobule relief
  for (let i = 0; i < 64; i++) {
    const x = (i * 61) % 256;
    const y = (i * 109) % 256;
    const r = 6 + (i % 5) * 4;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.4;
  for (let v = 0; v < 24; v++) {
    const sx = (v * 37) % 256;
    const sy = (v * 83) % 256;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + 28) % 256, (sy + 19) % 256, (sx + 54) % 256, (sy - 14 + 256) % 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAniso;
  return tex;
}

export function createStriatedMuscleTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#7f1d1d');
  grad.addColorStop(0.5, '#b91c2c');
  grad.addColorStop(1, '#881337');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Longitudinal myofibril striations
  for (let y = 0; y < 256; y += 4) {
    ctx.strokeStyle = y % 12 === 0 ? 'rgba(254, 202, 202, 0.28)' : 'rgba(69, 10, 10, 0.28)';
    ctx.lineWidth = y % 12 === 0 ? 1.3 : 1.0;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + Math.sin(y) * 2.5, 170, y - Math.cos(y) * 2.5, 256, y);
    ctx.stroke();
  }
  // White aponeurosis / tendon fascia streaks at ends
  const fasciaLeft = ctx.createLinearGradient(0, 0, 48, 0);
  fasciaLeft.addColorStop(0, 'rgba(241, 245, 249, 0.42)');
  fasciaLeft.addColorStop(1, 'rgba(241, 245, 249, 0)');
  ctx.fillStyle = fasciaLeft;
  ctx.fillRect(0, 0, 48, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAniso;
  return tex;
}

export function createBoneTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#ece5d5';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    const x = (i * 47) % 256;
    const y = (i * 89) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(180, 165, 138, 0.16)' : 'rgba(255, 253, 245, 0.22)';
    ctx.fillRect(x, y, 3, 14);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createLungAlveolarTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#f48093';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(159, 18, 57, 0.26)';
  ctx.lineWidth = 1.4;
  for (let y = 12; y < 256; y += 22) {
    for (let x = 10; x < 256; x += 22) {
      const ox = x + ((y / 22) % 2) * 11;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const px = ox + Math.cos(a) * 10;
        const py = y + Math.sin(a) * 10;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAniso;
  return tex;
}

export function createLiverLobuleTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 95; i++) {
    const x = (i * 59) % 256;
    const y = (i * 97) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(154, 52, 18, 0.35)' : 'rgba(67, 20, 7, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 7 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createCompoundEyeTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#291d0e';
  ctx.fillRect(0, 0, 256, 256);
  const step = 16;
  const h = step * 0.866;
  for (let row = -1; row < 20; row++) {
    for (let col = -1; col < 18; col++) {
      const cx = col * step + (row % 2 === 0 ? 0 : step * 0.5);
      const cy = row * h;
      ctx.fillStyle = (row + col) % 2 === 0 ? '#5c4018' : '#3d280d';
      ctx.strokeStyle = '#120a03';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + Math.PI / 6;
        const px = cx + Math.cos(a) * (step * 0.52);
        const py = cy + Math.sin(a) * (step * 0.52);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAniso;
  return tex;
}

export function createWingVeinTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(218, 240, 255, 0.34)';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(71, 85, 105, 0.72)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.quadraticCurveTo(110, 40 + i * 22, 250, 24 + i * 26);
    ctx.stroke();
  }
  ctx.lineWidth = 1.2;
  for (let x = 45; x < 235; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x + 10, 236);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createLeafVeinTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#1d7a3b';
  ctx.fillRect(0, 0, 256, 256);

  // Midrib & lateral leaf veins
  ctx.strokeStyle = '#6ee787';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 250);
  ctx.lineTo(128, 12);
  ctx.stroke();

  ctx.lineWidth = 2.2;
  for (let y = 220; y >= 42; y -= 26) {
    const spread = 85 - Math.abs(y - 135) * 0.45;
    ctx.beginPath();
    ctx.moveTo(128, y);
    ctx.quadraticCurveTo(128 + spread * 0.55, y - 10, 128 + spread, y - 24);
    ctx.moveTo(128, y);
    ctx.quadraticCurveTo(128 - spread * 0.55, y - 10, 128 - spread, y - 24);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function createFishScaleTexture(maxAniso: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0c4a6e');
  grad.addColorStop(0.45, '#0ea5e9');
  grad.addColorStop(0.82, '#bae6fd');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.4;
  for (let y = 12; y < 256; y += 18) {
    for (let x = 0; x < 256; x += 22) {
      const ox = x + ((y / 18) % 2) * 11;
      ctx.beginPath();
      ctx.arc(ox, y, 11, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }
  }

  // Lateral line dash accent
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 116);
  ctx.lineTo(256, 116);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

// ---------- Registry Helper ----------

export class PartRegistry {
  parts = new Map<string, InteractivePartEntry>();
  clickableMeshes: THREE.Mesh[] = [];
  shellMeshes: THREE.Mesh[] = [];
  textures: THREE.Texture[] = [];

  registerPart(
    partId: string,
    group: THREE.Group,
    explodeOffset: THREE.Vector3,
    options?: { clickable?: boolean }
  ) {
    const clickable = options?.clickable !== false;
    const meshes: THREE.Mesh[] = [];
    const baseEmissiveMap = new WeakMap<THREE.Mesh, THREE.Color>();
    const baseOpacityMap = new WeakMap<THREE.Mesh, number>();
    const baseTransparentMap = new WeakMap<THREE.Mesh, boolean>();
    const baseDepthWriteMap = new WeakMap<THREE.Mesh, boolean>();

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.userData.partId = partId;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          if (mat.emissive) {
            baseEmissiveMap.set(mesh, mat.emissive.clone());
          }
          baseOpacityMap.set(mesh, typeof mat.opacity === 'number' ? mat.opacity : 1);
          baseTransparentMap.set(mesh, Boolean(mat.transparent));
          baseDepthWriteMap.set(mesh, mat.depthWrite !== false);
        }
        meshes.push(mesh);
        if (clickable) {
          this.clickableMeshes.push(mesh);
        }
      }
    });

    this.parts.set(partId, {
      partId,
      group,
      meshes,
      basePos: group.position.clone(),
      explodeOffset,
      baseEmissiveMap,
      baseOpacityMap,
      baseTransparentMap,
      baseDepthWriteMap,
    });
  }
}

export function addPedestal(
  root: THREE.Group,
  reg: PartRegistry,
  maxAniso: number,
  radius = 1.65
) {
  const ringTex = createPedestalRingTexture(maxAniso);
  const shadowTex = createRadialShadowTexture(maxAniso);
  reg.textures.push(ringTex, shadowTex);

  const plinthGeo = new THREE.CylinderGeometry(radius, radius * 1.06, 0.14, 48);
  const plinthMat = new THREE.MeshStandardMaterial({
    map: ringTex,
    roughness: 0.42,
    metalness: 0.48,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.y = -0.07;
  plinth.receiveShadow = true;
  root.add(plinth);

  const rimGeo = new THREE.TorusGeometry(radius, 0.025, 12, 64);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.25,
    metalness: 0.85,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.005;
  root.add(rim);

  const shadowGeo = new THREE.PlaneGeometry(radius * 2.1, radius * 2.1);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  shadowPlane.renderOrder = 1;
  root.add(shadowPlane);
}

// ============================================================================
// 1. HUMAN BODY SPECIMEN (14 composite StudyFi-grade anatomical sub-systems)
// ============================================================================

function buildHumanSpecimen(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  const brainBump = createBrainBumpTexture(maxAniso);
  const tissueBump = createTissueMicroTexture(maxAniso);
  const muscleTex = createStriatedMuscleTexture(maxAniso);
  const boneTex = createBoneTexture(maxAniso);
  const lungTex = createLungAlveolarTexture(maxAniso);
  const liverTex = createLiverLobuleTexture(maxAniso);
  reg.textures.push(brainBump, tissueBump, muscleTex, boneTex, lungTex, liverTex);

  // --- 1. Brain & Cranial Core (Frontal/Temporal/Occipital lobes, Cerebellum, Brainstem) ---
  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 3.05, 0.02);
  const brainMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4a28c,
    roughness: 0.48,
    metalness: 0.0,
    bumpMap: brainBump,
    bumpScale: 0.036,
    clearcoat: 0.42,
    clearcoatRoughness: 0.36,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xfecdd3),
  });
  [-1, 1].forEach((side) => {
    const cerebrum = new THREE.Mesh(new THREE.SphereGeometry(0.138, 24, 20), brainMat);
    cerebrum.scale.set(0.76, 0.9, 1.18);
    cerebrum.position.set(side * 0.072, 0.04, 0.01);
    const temporal = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.09, 6, 12), brainMat);
    temporal.rotation.x = Math.PI / 2 - 0.2;
    temporal.position.set(side * 0.115, -0.02, 0.02);
    brainGroup.add(cerebrum, temporal);
  });
  const cerebellum = new THREE.Mesh(
    new THREE.SphereGeometry(0.082, 18, 14),
    new THREE.MeshPhysicalMaterial({
      color: 0xd9806b,
      roughness: 0.62,
      bumpMap: brainBump,
      bumpScale: 0.025,
      clearcoat: 0.25,
    })
  );
  cerebellum.scale.set(1.28, 0.72, 0.84);
  cerebellum.position.set(0, -0.055, -0.095);
  const brainStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.024, 0.15, 14),
    new THREE.MeshStandardMaterial({ color: 0xf0c2b4, roughness: 0.58 })
  );
  brainStem.position.set(0, -0.115, -0.04);
  brainStem.rotation.x = 0.24;
  brainGroup.add(cerebellum, brainStem);
  root.add(brainGroup);
  reg.registerPart('brain', brainGroup, new THREE.Vector3(0, 0.68, 0));

  // --- 2. Spinal Cord & Peripheral Nervous Network (Brachial, Intercostal, Sciatic/Femoral) ---
  const nervousGroup = new THREE.Group();
  const nerveMat = new THREE.MeshPhysicalMaterial({
    color: 0xfde047,
    roughness: 0.38,
    metalness: 0.05,
    emissive: new THREE.Color(0x713f12),
    emissiveIntensity: 0.22,
    clearcoat: 0.3,
  });
  const spinalCordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.94, -0.03),
    new THREE.Vector3(0, 2.66, -0.12),
    new THREE.Vector3(0, 2.12, -0.15),
    new THREE.Vector3(0, 1.48, -0.13),
  ]);
  nervousGroup.add(new THREE.Mesh(new THREE.TubeGeometry(spinalCordCurve, 28, 0.017, 10, false), nerveMat));
  [-1, 1].forEach((side) => {
    // Brachial plexus -> ulnar/median arm nerve
    const armNerve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.02, 2.62, -0.11),
      new THREE.Vector3(side * 0.28, 2.52, -0.04),
      new THREE.Vector3(side * 0.42, 2.2, 0),
      new THREE.Vector3(side * 0.48, 1.62, 0.03),
    ]);
    nervousGroup.add(new THREE.Mesh(new THREE.TubeGeometry(armNerve, 18, 0.009, 8, false), nerveMat));
    // Intercostal thoracic nerves
    for (let i = 0; i < 4; i++) {
      const y = 2.38 - i * 0.11;
      const icCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.02, y, -0.14),
        new THREE.Vector3(side * 0.24, y - 0.02, 0.02),
        new THREE.Vector3(side * 0.14, y - 0.04, 0.19),
      ]);
      nervousGroup.add(new THREE.Mesh(new THREE.TubeGeometry(icCurve, 12, 0.005, 6, false), nerveMat));
    }
    // Sciatic & femoral leg nerves
    const sciatic = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.03, 1.46, -0.12),
      new THREE.Vector3(side * 0.15, 1.32, -0.06),
      new THREE.Vector3(side * 0.16, 0.88, -0.02),
      new THREE.Vector3(side * 0.145, 0.34, 0.0),
    ]);
    nervousGroup.add(new THREE.Mesh(new THREE.TubeGeometry(sciatic, 20, 0.01, 8, false), nerveMat));
  });
  // Neural action potential impulses travelling along spine & limbs (inside nervousGroup so Hide/Isolate affects them)
  const sparkGeo = new THREE.SphereGeometry(0.016, 10, 8);
  const sparkCount = 12;
  const neuralFlow = new THREE.InstancedMesh(
    sparkGeo,
    new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    sparkCount
  );
  neuralFlow.frustumCulled = false;
  nervousGroup.add(neuralFlow);
  root.add(nervousGroup);
  reg.registerPart('nervous_network', nervousGroup, new THREE.Vector3(0, 0.15, -0.68));

  // --- 3. Eyes & Optic Pathways ---
  const eyesGroup = new THREE.Group();
  eyesGroup.position.set(0, 3.01, 0.18);
  const scleraMat = new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.16, clearcoat: 0.9 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1 });
  const eyePupils: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 14), scleraMat);
    globe.position.set(side * 0.062, 0, 0);
    const iris = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 16), irisMat);
    iris.rotation.x = Math.PI / 2;
    iris.position.set(side * 0.062, 0, 0.031);
    const pupil = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 12), pupilMat);
    pupil.rotation.x = Math.PI / 2;
    pupil.position.set(side * 0.062, 0, 0.032);
    eyePupils.push(pupil);
    const opticCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.062, 0, -0.025),
      new THREE.Vector3(side * 0.02, 0.01, -0.09),
      new THREE.Vector3(0, 0.02, -0.14),
    ]);
    const opticNerve = new THREE.Mesh(new THREE.TubeGeometry(opticCurve, 10, 0.008, 8, false), nerveMat);
    eyesGroup.add(globe, iris, pupil, opticNerve);
  });
  root.add(eyesGroup);
  reg.registerPart('eyes_senses', eyesGroup, new THREE.Vector3(0, 0.35, 0.72));

  // --- 4. Heart (Four Chambers + Coronary Vessels + Great Vessel Roots) ---
  const heartGroup = new THREE.Group();
  heartGroup.position.set(0.045, 2.22, 0.085);
  const heartMat = new THREE.MeshPhysicalMaterial({
    color: 0xc81e2b,
    roughness: 0.32,
    metalness: 0.04,
    bumpMap: tissueBump,
    bumpScale: 0.016,
    clearcoat: 0.68,
    clearcoatRoughness: 0.2,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xfca5a5),
  });
  const ventricleCone = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 20), heartMat);
  ventricleCone.scale.set(0.88, 1.18, 0.85);
  ventricleCone.rotation.z = 0.34;
  const rightAtrium = new THREE.Mesh(
    new THREE.SphereGeometry(0.066, 18, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x991b1b, roughness: 0.42, clearcoat: 0.48 })
  );
  rightAtrium.position.set(-0.065, 0.075, 0.01);
  const leftAtrium = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 18, 16),
    new THREE.MeshPhysicalMaterial({ color: 0xb91c1c, roughness: 0.4, clearcoat: 0.48 })
  );
  leftAtrium.position.set(0.06, 0.082, -0.025);
  const coronaryBranch = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.01, 0.08, 0.06),
        new THREE.Vector3(0.025, 0.01, 0.095),
        new THREE.Vector3(0.055, -0.08, 0.07),
      ]),
      14,
      0.007,
      6,
      false
    ),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 })
  );
  heartGroup.add(ventricleCone, rightAtrium, leftAtrium, coronaryBranch);
  root.add(heartGroup);
  reg.registerPart('heart', heartGroup, new THREE.Vector3(0.55, 0.14, 0.72));

  // --- 5. Arterial & Venous Vascular Tree + Erythrocyte Flow ---
  const vascularGroup = new THREE.Group();
  const arteryMat = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    roughness: 0.34,
    metalness: 0.06,
    clearcoat: 0.45,
  });
  const veinMat = new THREE.MeshPhysicalMaterial({
    color: 0x2563eb,
    roughness: 0.38,
    metalness: 0.05,
    clearcoat: 0.4,
  });

  // Aortic Arch + Thoracic & Abdominal Descending Aorta
  const mainAortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.04, 2.28, 0.08),
    new THREE.Vector3(0.06, 2.42, 0.06),
    new THREE.Vector3(0.0, 2.44, -0.02),
    new THREE.Vector3(-0.025, 2.1, -0.07),
    new THREE.Vector3(-0.02, 1.56, -0.05),
    new THREE.Vector3(0, 1.4, -0.02),
  ]);
  vascularGroup.add(new THREE.Mesh(new THREE.TubeGeometry(mainAortaCurve, 34, 0.024, 10, false), arteryMat));

  // Inferior & Superior Vena Cava
  const ivcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.025, 1.4, -0.03),
    new THREE.Vector3(0.03, 1.9, -0.03),
    new THREE.Vector3(-0.03, 2.28, 0.05),
    new THREE.Vector3(-0.04, 2.52, 0.03),
  ]);
  vascularGroup.add(new THREE.Mesh(new THREE.TubeGeometry(ivcCurve, 28, 0.022, 10, false), veinMat));

  // Bilateral Carotid/Jugular, Brachial, and Iliac/Femoral Vessels
  [-1, 1].forEach((side) => {
    const carotid = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.02, 2.44, 0.03),
      new THREE.Vector3(side * 0.045, 2.75, 0.02),
      new THREE.Vector3(side * 0.05, 3.0, 0.02),
    ]);
    const jugular = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.07, 2.98, 0.0),
      new THREE.Vector3(side * 0.065, 2.72, 0.01),
      new THREE.Vector3(side * 0.03, 2.46, 0.03),
    ]);
    const brachialArt = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.04, 2.44, 0.01),
      new THREE.Vector3(side * 0.28, 2.48, 0.0),
      new THREE.Vector3(side * 0.42, 2.15, 0.01),
      new THREE.Vector3(side * 0.47, 1.65, 0.03),
    ]);
    const femoralArt = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.4, -0.02),
      new THREE.Vector3(side * 0.13, 1.24, 0.02),
      new THREE.Vector3(side * 0.155, 0.86, 0.02),
      new THREE.Vector3(side * 0.145, 0.36, 0.01),
    ]);
    const femoralVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.165, 0.36, -0.01),
      new THREE.Vector3(side * 0.175, 0.86, -0.01),
      new THREE.Vector3(side * 0.14, 1.24, -0.01),
      new THREE.Vector3(0.025, 1.4, -0.03),
    ]);
    vascularGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(carotid, 14, 0.01, 8, false), arteryMat),
      new THREE.Mesh(new THREE.TubeGeometry(jugular, 14, 0.01, 8, false), veinMat),
      new THREE.Mesh(new THREE.TubeGeometry(brachialArt, 18, 0.009, 8, false), arteryMat),
      new THREE.Mesh(new THREE.TubeGeometry(femoralArt, 20, 0.012, 8, false), arteryMat),
      new THREE.Mesh(new THREE.TubeGeometry(femoralVein, 20, 0.012, 8, false), veinMat)
    );
  });

  // Animated Erythrocytes along Arterial & Venous Loops (parented to vascularGroup)
  const arterialFlowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 2.28, 0.09),
    new THREE.Vector3(0.04, 2.52, 0.06),
    new THREE.Vector3(0.01, 2.94, 0.02),
    new THREE.Vector3(-0.02, 2.44, -0.03),
    new THREE.Vector3(-0.02, 1.9, -0.06),
    new THREE.Vector3(-0.02, 1.4, -0.02),
    new THREE.Vector3(-0.15, 0.86, 0.02),
  ]);
  const venousFlowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.86, -0.01),
    new THREE.Vector3(0.04, 1.4, -0.03),
    new THREE.Vector3(0.03, 1.9, -0.03),
    new THREE.Vector3(-0.03, 2.31, 0.06),
    new THREE.Vector3(-0.18, 2.25, 0.01),
    new THREE.Vector3(0.18, 2.25, 0.01),
    new THREE.Vector3(0.05, 2.21, 0.09),
  ]);
  const rbcGeo = new THREE.SphereGeometry(0.016, 10, 8);
  rbcGeo.scale(1.15, 0.62, 1.15);
  const arterialCount = 26;
  const arterialFlow = new THREE.InstancedMesh(
    rbcGeo,
    new THREE.MeshBasicMaterial({ color: 0xfb7185 }),
    arterialCount
  );
  arterialFlow.frustumCulled = false;
  const venousCount = 20;
  const venousFlow = new THREE.InstancedMesh(
    rbcGeo,
    new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
    venousCount
  );
  venousFlow.frustumCulled = false;
  vascularGroup.add(arterialFlow, venousFlow);
  root.add(vascularGroup);
  reg.registerPart('vascular', vascularGroup, new THREE.Vector3(-0.45, 0.05, 0.52));

  // --- 6. Lungs, Trachea & Muscular Diaphragm ---
  const lungsGroup = new THREE.Group();
  lungsGroup.position.set(0, 2.25, 0.01);
  const lungMat = new THREE.MeshPhysicalMaterial({
    map: lungTex,
    color: 0xfb7185,
    roughness: 0.52,
    metalness: 0.0,
    bumpMap: tissueBump,
    bumpScale: 0.022,
    clearcoat: 0.28,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xfda4af),
  });
  const rightLung = new THREE.Mesh(new THREE.SphereGeometry(0.155, 22, 18), lungMat);
  rightLung.scale.set(0.84, 1.55, 0.92);
  rightLung.position.set(-0.185, -0.04, 0.01);
  rightLung.rotation.z = -0.1;

  const leftLung = new THREE.Mesh(new THREE.SphereGeometry(0.145, 22, 18), lungMat);
  leftLung.scale.set(0.78, 1.48, 0.9);
  leftLung.position.set(0.19, -0.04, 0.01);
  leftLung.rotation.z = 0.12;

  const tracheaMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.1 });
  const larynxCap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.07, 14), tracheaMat);
  larynxCap.position.set(0, 0.41, 0.01);
  const tracheaTube = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.34, 14), tracheaMat);
  tracheaTube.position.set(0, 0.24, 0);

  const bronchusLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.16, 10), tracheaMat);
  bronchusLeft.position.set(0.07, 0.07, 0);
  bronchusLeft.rotation.z = -0.78;
  const bronchusRight = bronchusLeft.clone();
  bronchusRight.position.x = -0.07;
  bronchusRight.rotation.z = 0.78;

  const diaphragmDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshPhysicalMaterial({
      color: 0xb91c1c,
      roughness: 0.5,
      sheen: 0.3,
      side: THREE.DoubleSide,
    })
  );
  diaphragmDome.scale.set(1.06, 0.38, 0.62);
  diaphragmDome.position.set(0, -0.25, 0.02);

  lungsGroup.add(rightLung, leftLung, larynxCap, tracheaTube, bronchusLeft, bronchusRight, diaphragmDome);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.005, 8, 18), tracheaMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.13 + i * 0.05, 0);
    lungsGroup.add(ring);
  }
  root.add(lungsGroup);
  reg.registerPart('lungs', lungsGroup, new THREE.Vector3(-0.78, 0.2, 0.38));

  // --- 7. Liver & Gallbladder ---
  const liverGroup = new THREE.Group();
  liverGroup.position.set(-0.11, 1.9, 0.09);
  const liverMat = new THREE.MeshPhysicalMaterial({
    map: liverTex,
    color: 0x9a3412,
    roughness: 0.32,
    metalness: 0.04,
    bumpMap: tissueBump,
    bumpScale: 0.012,
    clearcoat: 0.52,
    clearcoatRoughness: 0.26,
  });
  const mainLobe = new THREE.Mesh(new THREE.SphereGeometry(0.145, 22, 16), liverMat);
  mainLobe.scale.set(1.32, 0.75, 0.85);
  mainLobe.rotation.z = 0.22;
  const leftLobe = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), liverMat);
  leftLobe.scale.set(1.35, 0.58, 0.72);
  leftLobe.position.set(0.16, 0.02, 0.01);
  const gallbladder = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 14, 12),
    new THREE.MeshPhysicalMaterial({ color: 0x15803d, roughness: 0.32, clearcoat: 0.55 })
  );
  gallbladder.scale.set(0.8, 1.35, 0.8);
  gallbladder.position.set(-0.02, -0.075, 0.05);
  liverGroup.add(mainLobe, leftLobe, gallbladder);
  root.add(liverGroup);
  reg.registerPart('liver', liverGroup, new THREE.Vector3(-0.78, 0.0, 0.52));

  // --- 8. Esophagus & Stomach ---
  const stomachGroup = new THREE.Group();
  stomachGroup.position.set(0.12, 1.88, 0.06);
  const stomachMat = new THREE.MeshPhysicalMaterial({
    color: 0xea8c55,
    roughness: 0.46,
    metalness: 0.0,
    clearcoat: 0.35,
    sheen: 0.3,
  });
  const stomachCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.08, 0.18, -0.02),
    new THREE.Vector3(-0.02, 0.08, 0.02),
    new THREE.Vector3(0.08, -0.02, 0.04),
    new THREE.Vector3(-0.01, -0.1, 0.03),
    new THREE.Vector3(-0.11, -0.06, 0),
  ]);
  const stomachSac = new THREE.Mesh(new THREE.TubeGeometry(stomachCurve, 26, 0.062, 14, false), stomachMat);
  const fundusBulb = new THREE.Mesh(new THREE.SphereGeometry(0.082, 18, 14), stomachMat);
  fundusBulb.position.set(0.05, 0.02, 0.03);
  const esophagus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.022, 0.38, 12),
    new THREE.MeshStandardMaterial({ color: 0xd97757, roughness: 0.55 })
  );
  esophagus.position.set(-0.09, 0.34, -0.03);
  stomachGroup.add(stomachSac, fundusBulb, esophagus);
  root.add(stomachGroup);
  reg.registerPart('stomach', stomachGroup, new THREE.Vector3(0.75, -0.02, 0.55));

  // --- 9. Intestinal Tract (Haustrated Colon + Appendix + Coiled Small Intestine) ---
  const intGroup = new THREE.Group();
  intGroup.position.set(0, 1.56, 0.07);
  const colonCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.14, -0.13, 0.02),
    new THREE.Vector3(-0.15, 0.09, 0.02),
    new THREE.Vector3(0, 0.13, 0.04),
    new THREE.Vector3(0.15, 0.09, 0.02),
    new THREE.Vector3(0.13, -0.13, 0.01),
    new THREE.Vector3(0.02, -0.2, -0.02),
  ]);
  const colonMesh = new THREE.Mesh(
    new THREE.TubeGeometry(colonCurve, 34, 0.038, 12, false),
    new THREE.MeshPhysicalMaterial({ color: 0xc26d53, roughness: 0.48, clearcoat: 0.25 })
  );
  const appendix = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.011, 0.055, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.5 })
  );
  appendix.position.set(-0.16, -0.17, 0.03);
  appendix.rotation.z = 0.55;
  const smallPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    smallPts.push(
      new THREE.Vector3(
        Math.sin(t * Math.PI * 6) * 0.085,
        0.07 - t * 0.21,
        0.03 + Math.cos(t * Math.PI * 5) * 0.025
      )
    );
  }
  const smallIntestine = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smallPts), 54, 0.024, 10, false),
    new THREE.MeshPhysicalMaterial({ color: 0xe69f88, roughness: 0.54, clearcoat: 0.22 })
  );
  intGroup.add(colonMesh, appendix, smallIntestine);
  root.add(intGroup);
  reg.registerPart('intestines', intGroup, new THREE.Vector3(0, -0.35, 0.85));

  // --- 10. Endocrine & Lymphatic Glands (Thyroid, Thymus, Pancreas, Spleen, Adrenals) ---
  const endoGroup = new THREE.Group();
  const thyroidMat = new THREE.MeshPhysicalMaterial({ color: 0xd946ef, roughness: 0.42, clearcoat: 0.4 });
  [-1, 1].forEach((side) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), thyroidMat);
    lobe.scale.set(0.85, 1.4, 0.8);
    lobe.position.set(side * 0.034, 2.66, 0.03);
    endoGroup.add(lobe);
  });
  const thymus = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.48 })
  );
  thymus.scale.set(1.25, 0.85, 0.65);
  thymus.position.set(0, 2.42, 0.1);
  const pancreas = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.028, 0.14, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.46 })
  );
  pancreas.rotation.z = Math.PI / 2 - 0.18;
  pancreas.position.set(0.04, 1.81, 0.0);
  const spleen = new THREE.Mesh(
    new THREE.SphereGeometry(0.056, 16, 14),
    new THREE.MeshPhysicalMaterial({ color: 0x7e22ce, roughness: 0.36, clearcoat: 0.48 })
  );
  spleen.scale.set(0.72, 1.18, 0.86);
  spleen.position.set(0.24, 1.89, -0.02);
  endoGroup.add(thymus, pancreas, spleen);
  [-1, 1].forEach((side) => {
    const adrenal = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.036, 10),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.48 })
    );
    adrenal.position.set(side * 0.14, side === -1 ? 1.87 : 1.84, -0.075);
    endoGroup.add(adrenal);
  });
  root.add(endoGroup);
  reg.registerPart('endocrine_lymph', endoGroup, new THREE.Vector3(0.75, 0.25, -0.25));

  // --- 11. Kidneys, Ureters & Urinary Bladder ---
  const kidneysGroup = new THREE.Group();
  kidneysGroup.position.set(0, 1.78, -0.08);
  const kidneyMat = new THREE.MeshPhysicalMaterial({
    color: 0x7f1d1d,
    roughness: 0.36,
    metalness: 0.04,
    clearcoat: 0.45,
  });
  const ureterMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.55 });
  [-1, 1].forEach((side) => {
    const kMesh = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 14), kidneyMat);
    kMesh.scale.set(0.72, 1.32, 0.65);
    kMesh.position.set(side * 0.145, side === -1 ? 0.02 : -0.01, 0);
    kMesh.rotation.z = side * -0.18;

    const ureterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.11, -0.02, 0.01),
      new THREE.Vector3(side * 0.08, -0.18, 0.03),
      new THREE.Vector3(side * 0.035, -0.37, 0.09),
    ]);
    const ureter = new THREE.Mesh(new THREE.TubeGeometry(ureterCurve, 14, 0.009, 8, false), ureterMat);
    kidneysGroup.add(kMesh, ureter);
  });
  const bladder = new THREE.Mesh(
    new THREE.SphereGeometry(0.056, 16, 14),
    new THREE.MeshPhysicalMaterial({ color: 0xfb923c, roughness: 0.44, clearcoat: 0.35 })
  );
  bladder.scale.set(1.05, 0.88, 0.92);
  bladder.position.set(0, -0.4, 0.1);
  kidneysGroup.add(bladder);
  root.add(kidneysGroup);
  reg.registerPart('kidneys', kidneysGroup, new THREE.Vector3(0, -0.1, -0.82));

  // --- 12. Full Human Skeleton ---
  const skelGroup = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({
    map: boneTex,
    color: 0xebe4d4,
    roughness: 0.52,
    metalness: 0.05,
  });
  const skullDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.65),
    new THREE.MeshPhysicalMaterial({
      map: boneTex,
      color: 0xebe4d4,
      roughness: 0.42,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  skullDome.position.set(0, 3.06, 0.01);
  const jawBone = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.024, 8, 18, Math.PI), boneMat);
  jawBone.rotation.set(Math.PI * 0.52, 0, Math.PI);
  jawBone.position.set(0, 2.91, 0.09);
  skelGroup.add(skullDome, jawBone);

  for (let i = 0; i < 15; i++) {
    const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.062, 10), boneMat);
    vert.position.set(0, 1.44 + i * 0.098, -0.14 + Math.sin(i * 0.32) * 0.018);
    skelGroup.add(vert);
  }
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.48, 0.024), boneMat);
  sternum.position.set(0, 2.24, 0.24);
  skelGroup.add(sternum);

  for (let r = 0; r < 7; r++) {
    const y = 2.46 - r * 0.082;
    const width = 0.28 + Math.sin((r / 6) * Math.PI) * 0.085;
    [-1, 1].forEach((side) => {
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.03, y, -0.14),
        new THREE.Vector3(side * width, y - 0.02, 0.03),
        new THREE.Vector3(side * (width * 0.55), y - 0.045, 0.22),
        new THREE.Vector3(side * 0.028, y - 0.04, 0.24),
      ]);
      const rib = new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 16, 0.013, 8, false), boneMat);
      skelGroup.add(rib);
    });
  }
  const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.038, 10, 24), boneMat);
  pelvis.rotation.x = Math.PI / 2.2;
  pelvis.scale.set(1.22, 0.72, 1);
  pelvis.position.set(0, 1.38, 0);
  skelGroup.add(pelvis);

  [-1, 1].forEach((side) => {
    const clavicle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 8), boneMat);
    clavicle.rotation.z = side * (Math.PI / 2 - 0.14);
    clavicle.position.set(side * 0.19, 2.53, 0.12);
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.64, 10), boneMat);
    femur.position.set(side * 0.16, 1.0, 0);
    femur.rotation.z = side * -0.05;
    const patella = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), boneMat);
    patella.position.set(side * 0.15, 0.68, 0.032);
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.62, 10), boneMat);
    tibia.position.set(side * 0.145, 0.36, 0);
    const footBone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.19), boneMat);
    footBone.position.set(side * 0.145, 0.04, 0.06);
    const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.52, 10), boneMat);
    humerus.position.set(side * 0.41, 2.28, 0);
    humerus.rotation.z = side * 0.14;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.46, 10), boneMat);
    forearm.position.set(side * 0.47, 1.82, 0.03);
    forearm.rotation.z = side * 0.08;
    skelGroup.add(clavicle, femur, patella, tibia, footBone, humerus, forearm);
  });
  root.add(skelGroup);
  reg.registerPart('skeleton', skelGroup, new THREE.Vector3(0, 0, -0.75));

  // --- 13. Skeletal Musculature Layer (Striated Pectorals, Deltoids, Abs, Quads, Calves) ---
  const musclesGroup = new THREE.Group();
  const muscleMat = new THREE.MeshPhysicalMaterial({
    map: muscleTex,
    color: 0xb91c2e,
    roughness: 0.48,
    metalness: 0.02,
    bumpMap: muscleTex,
    bumpScale: 0.022,
    sheen: 0.4,
    sheenColor: new THREE.Color(0xfecaca),
    transparent: true,
    opacity: 0.78,
    depthWrite: true,
  });

  [-1, 1].forEach((side) => {
    // Pectoralis Major fan
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 14), muscleMat);
    pec.scale.set(1.08, 0.78, 0.45);
    pec.position.set(side * 0.145, 2.34, 0.21);
    pec.rotation.y = side * -0.22;

    // Deltoid shoulder cap
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 12), muscleMat);
    delt.scale.set(0.95, 1.32, 0.92);
    delt.position.set(side * 0.37, 2.45, 0.01);

    // Biceps brachii + Forearm
    const bicep = new THREE.Mesh(new THREE.CapsuleGeometry(0.056, 0.26, 6, 12), muscleMat);
    bicep.position.set(side * 0.42, 2.21, 0.015);
    bicep.rotation.z = side * 0.14;
    const forearmM = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.28, 6, 12), muscleMat);
    forearmM.position.set(side * 0.47, 1.82, 0.035);
    forearmM.rotation.z = side * 0.08;

    // Sternocleidomastoid neck band
    const scm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.24, 10), muscleMat);
    scm.position.set(side * 0.065, 2.72, 0.05);
    scm.rotation.z = side * -0.18;

    // External Oblique flank
    const oblique = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 6, 12), muscleMat);
    oblique.position.set(side * 0.23, 1.82, 0.06);
    oblique.rotation.z = side * -0.08;

    // Quadriceps + Gastrocnemius Calf
    const quad = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.46, 8, 14), muscleMat);
    quad.position.set(side * 0.16, 1.0, 0.015);
    quad.rotation.z = side * -0.05;
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.38, 8, 12), muscleMat);
    calf.position.set(side * 0.145, 0.38, -0.015);

    musclesGroup.add(pec, delt, bicep, forearmM, scm, oblique, quad, calf);
  });

  // Segmented Rectus Abdominis (4 pairs of abdominal bellies)
  for (let row = 0; row < 4; row++) {
    const ry = 2.11 - row * 0.125;
    [-1, 1].forEach((side) => {
      const ab = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 10), muscleMat);
      ab.scale.set(1.15, 0.95, 0.55);
      ab.position.set(side * 0.062, ry, 0.205 - row * 0.008);
      musclesGroup.add(ab);
    });
  }
  root.add(musclesGroup);
  reg.registerPart('muscles', musclesGroup, new THREE.Vector3(-0.68, 0.06, 0.35));

  // --- 14. Translucent Integumentary Skin Envelope ---
  const outerGroup = new THREE.Group();
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.28,
    metalness: 0.06,
    sheen: 0.25,
    sheenColor: new THREE.Color(0xe2e8f0),
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  const torsoProfile = [
    new THREE.Vector2(0.01, 1.25),
    new THREE.Vector2(0.285, 1.32),
    new THREE.Vector2(0.25, 1.65),
    new THREE.Vector2(0.295, 2.02),
    new THREE.Vector2(0.355, 2.48),
    new THREE.Vector2(0.14, 2.66),
    new THREE.Vector2(0.11, 2.8),
    new THREE.Vector2(0.01, 2.84),
  ];
  const torsoShell = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 28), shellMat);
  torsoShell.scale.set(1.08, 1, 0.72);
  torsoShell.renderOrder = 4;

  const headShell = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 20), shellMat);
  headShell.scale.set(0.88, 1.08, 0.96);
  headShell.position.set(0, 3.04, 0.01);
  headShell.renderOrder = 4;

  outerGroup.add(torsoShell, headShell);
  [-1, 1].forEach((side) => {
    const legShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 1.18, 8, 16), shellMat);
    legShell.position.set(side * 0.155, 0.68, 0);
    legShell.renderOrder = 4;
    const armShell = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.92, 8, 16), shellMat);
    armShell.position.set(side * 0.44, 2.05, 0.01);
    armShell.rotation.z = side * 0.11;
    armShell.renderOrder = 4;
    outerGroup.add(legShell, armShell);
  });

  root.add(outerGroup);
  reg.shellMeshes.push(...(outerGroup.children as THREE.Mesh[]));
  reg.registerPart('outer_body', outerGroup, new THREE.Vector3(0, 0, -0.45));

  const neuralSpinalCurve = spinalCordCurve;

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      // Two-phase cardiac Lub-Dub contraction (~72 bpm)
      const cycle = (elapsed * 1.2) % 1;
      const lub = Math.exp(-Math.pow((cycle - 0.14) / 0.052, 2));
      const dub = 0.65 * Math.exp(-Math.pow((cycle - 0.32) / 0.048, 2));
      const atrialKick = Math.exp(-Math.pow((cycle - 0.06) / 0.045, 2));

      heartGroup.scale.setScalar(1 + (lub + dub) * 0.085);
      ventricleCone.scale.set(0.88 * (1 + lub * 0.09), 1.18 * (1 - lub * 0.05), 0.85 * (1 + lub * 0.09));
      rightAtrium.scale.setScalar(1 + atrialKick * 0.14);
      leftAtrium.scale.setScalar(1 + atrialKick * 0.12);

      // Synchronized respiratory chest expansion + diaphragm dome flattening
      const breath = Math.sin(elapsed * 1.45);
      const tidal = 0.5 + 0.5 * breath;
      rightLung.scale.set(0.84 * (1 + breath * 0.048), 1.55 * (1 + breath * 0.02), 0.92 * (1 + breath * 0.052));
      leftLung.scale.set(0.78 * (1 + breath * 0.048), 1.48 * (1 + breath * 0.02), 0.9 * (1 + breath * 0.052));
      diaphragmDome.position.y = -0.24 - tidal * 0.045;
      diaphragmDome.scale.y = 0.42 - tidal * 0.12;
      sternum.position.z = 0.24 + tidal * 0.018;

      // Subtle eye pupil accommodation & GI peristalsis wave
      const pupScale = 1 + Math.sin(elapsed * 1.9) * 0.1;
      eyePupils.forEach((p) => p.scale.set(pupScale, 1, pupScale));
      stomachGroup.scale.set(1 + Math.sin(elapsed * 2.1) * 0.025, 1 + Math.cos(elapsed * 2.1) * 0.02, 1);
      intGroup.scale.set(1 + Math.sin(elapsed * 1.7 + 1.2) * 0.018, 1, 1 + Math.cos(elapsed * 1.7) * 0.018);

      // Pulsatile RBC circulation along aorta & vena cava
      const pulseBoost = elapsed * 0.34 + (lub + dub) * 0.015;
      for (let i = 0; i < arterialCount; i++) {
        const u = (pulseBoost + i / arterialCount) % 1;
        arterialFlowCurve.getPointAt(u, _animPt);
        arterialFlowCurve.getTangentAt(u, _animTan);
        _animDummy.position.copy(_animPt);
        _animDummy.lookAt(_animPt.x + _animTan.x, _animPt.y + _animTan.y, _animPt.z + _animTan.z);
        _animDummy.scale.setScalar(0.85 + lub * 0.35);
        _animDummy.updateMatrix();
        arterialFlow.setMatrixAt(i, _animDummy.matrix);
      }
      arterialFlow.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < venousCount; i++) {
        const u = (elapsed * 0.26 + i / venousCount) % 1;
        venousFlowCurve.getPointAt(u, _animPt);
        _animDummy.position.copy(_animPt);
        _animDummy.rotation.set(0, elapsed * 1.5 + i, 0);
        _animDummy.scale.setScalar(0.95);
        _animDummy.updateMatrix();
        venousFlow.setMatrixAt(i, _animDummy.matrix);
      }
      venousFlow.instanceMatrix.needsUpdate = true;

      // Neural action potentials descending brainstem -> spinal cord -> limbs
      for (let i = 0; i < sparkCount; i++) {
        const u = (elapsed * 0.65 + i / sparkCount) % 1;
        neuralSpinalCurve.getPointAt(u, _animPt);
        _animDummy.position.copy(_animPt);
        _animDummy.scale.setScalar(0.75 + Math.sin(elapsed * 8 + i) * 0.35);
        _animDummy.updateMatrix();
        neuralFlow.setMatrixAt(i, _animDummy.matrix);
      }
      neuralFlow.instanceMatrix.needsUpdate = true;
    },
  };
}

// ============================================================================
// 2. HONEYBEE SPECIMEN (7 composite entomological sub-groups)
// ============================================================================

function buildBeeSpecimen(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.7);

  const eyeTex = createCompoundEyeTexture(maxAniso);
  const wingTex = createWingVeinTexture(maxAniso);
  reg.textures.push(eyeTex, wingTex);

  const chitinDark = new THREE.MeshStandardMaterial({ color: 0x261a10, roughness: 0.34, metalness: 0.14 });
  const chitinAmber = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.48, metalness: 0.06 });
  const fuzzMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9, metalness: 0.0 });

  // --- 1. Head & Compound Eyes ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0.95);
  const headCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 18), chitinDark);
  headCap.scale.set(1.05, 0.95, 0.85);
  const eyeMat = new THREE.MeshPhysicalMaterial({
    map: eyeTex,
    roughness: 0.18,
    metalness: 0.1,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), eyeMat);
  leftEye.scale.set(0.62, 1.25, 0.88);
  leftEye.position.set(-0.22, 0.04, 0.05);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.22;
  const proboscis = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.26, 12), chitinAmber);
  proboscis.position.set(0, -0.24, 0.14);
  proboscis.rotation.x = Math.PI * 0.72;
  headGroup.add(headCap, leftEye, rightEye, proboscis);
  root.add(headGroup);
  reg.registerPart('bee_head', headGroup, new THREE.Vector3(0, 0.28, 0.82));

  // --- 2. Segmented Elbowed Antennae ---
  const antGroup = new THREE.Group();
  antGroup.position.set(0, 1.22, 1.12);
  [-1, 1].forEach((side) => {
    const antCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.08, 0, 0),
      new THREE.Vector3(side * 0.16, 0.2, 0.22),
      new THREE.Vector3(side * 0.34, 0.14, 0.5),
      new THREE.Vector3(side * 0.44, 0.02, 0.65),
    ]);
    const antMesh = new THREE.Mesh(new THREE.TubeGeometry(antCurve, 18, 0.02, 8, false), chitinDark);
    const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 10), chitinAmber);
    tipBall.position.set(side * 0.44, 0.02, 0.65);
    antGroup.add(antMesh, tipBall);
  });
  root.add(antGroup);
  reg.registerPart('bee_antennae', antGroup, new THREE.Vector3(0, 0.58, 0.95));

  // --- 3. Thorax ---
  const thoraxGroup = new THREE.Group();
  thoraxGroup.position.set(0, 1.15, 0.36);
  const thoraxCore = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), fuzzMat);
  thoraxCore.scale.set(1.05, 0.95, 1.15);
  const scutellum = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), chitinDark);
  scutellum.scale.set(0.95, 0.55, 1.05);
  scutellum.position.set(0, 0.18, 0.04);
  const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.055, 10, 24), chitinAmber);
  collarRing.position.set(0, 0.02, 0.22);
  thoraxGroup.add(thoraxCore, scutellum, collarRing);
  root.add(thoraxGroup);
  reg.registerPart('bee_thorax', thoraxGroup, new THREE.Vector3(0, 0.42, 0));

  // --- 4. Forewings & Hindwings ---
  const wingsGroup = new THREE.Group();
  wingsGroup.position.set(0, 1.42, 0.34);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.bezierCurveTo(0.45, 0.18, 1.15, 0.24, 1.42, 0.02);
  wingShape.bezierCurveTo(1.22, -0.24, 0.55, -0.28, 0, -0.05);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  const wingMat = new THREE.MeshPhysicalMaterial({
    map: wingTex,
    color: 0xe0f2fe,
    roughness: 0.16,
    metalness: 0.05,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const leftWingPivot = new THREE.Group();
  leftWingPivot.position.set(-0.18, 0, 0.05);
  const leftForeWing = new THREE.Mesh(wingGeo, wingMat);
  leftForeWing.rotation.set(-Math.PI / 2 + 0.12, Math.PI, -0.25);
  const leftHindWing = new THREE.Mesh(wingGeo, wingMat);
  leftHindWing.scale.set(0.68, 0.72, 1);
  leftHindWing.rotation.set(-Math.PI / 2 + 0.12, Math.PI, -0.52);
  leftHindWing.position.set(0, -0.02, -0.14);
  leftWingPivot.add(leftForeWing, leftHindWing);

  const rightWingPivot = new THREE.Group();
  rightWingPivot.position.set(0.18, 0, 0.05);
  const rightForeWing = new THREE.Mesh(wingGeo, wingMat);
  rightForeWing.rotation.set(-Math.PI / 2 + 0.12, 0, 0.25);
  const rightHindWing = new THREE.Mesh(wingGeo, wingMat);
  rightHindWing.scale.set(0.68, 0.72, 1);
  rightHindWing.rotation.set(-Math.PI / 2 + 0.12, 0, 0.52);
  rightHindWing.position.set(0, -0.02, -0.14);
  rightWingPivot.add(rightForeWing, rightHindWing);

  wingsGroup.add(leftWingPivot, rightWingPivot);
  root.add(wingsGroup);
  reg.registerPart('bee_wings', wingsGroup, new THREE.Vector3(0, 0.92, -0.1));

  // --- 5. Six Jointed Legs + Pollen Baskets ---
  const legsGroup = new THREE.Group();
  const zOffsets = [0.62, 0.34, 0.05];
  zOffsets.forEach((zOff, idx) => {
    [-1, 1].forEach((side) => {
      const legCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.24, 0.96, zOff),
        new THREE.Vector3(side * (0.58 + idx * 0.08), 0.76, zOff - 0.08),
        new THREE.Vector3(side * (0.64 + idx * 0.12), 0.28, zOff - 0.16),
        new THREE.Vector3(side * (0.74 + idx * 0.14), 0.04, zOff - 0.24),
      ]);
      const legMesh = new THREE.Mesh(new THREE.TubeGeometry(legCurve, 16, 0.026, 8, false), chitinDark);
      legsGroup.add(legMesh);

      if (idx === 2) {
        // Hind-leg golden pollen basket (corbicula)
        const pollenPellet = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 14, 12),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.78, metalness: 0.0 })
        );
        pollenPellet.scale.set(0.85, 1.35, 0.85);
        pollenPellet.position.set(side * 0.82, 0.42, zOff - 0.15);
        legsGroup.add(pollenPellet);
      }
    });
  });
  root.add(legsGroup);
  reg.registerPart('bee_legs', legsGroup, new THREE.Vector3(0, -0.22, 0));

  // --- 6. Striped Abdomen & Spiracles ---
  const abdGroup = new THREE.Group();
  abdGroup.position.set(0, 1.05, -0.58);
  const segCount = 6;
  for (let s = 0; s < segCount; s++) {
    const t = s / (segCount - 1);
    const radius = 0.24 + Math.sin(t * Math.PI * 0.88 + 0.2) * 0.22;
    const zPos = 0.42 - s * 0.19;
    const mat = s % 2 === 0 ? chitinAmber : chitinDark;
    const ring = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 16), mat);
    ring.scale.set(0.95, 0.92, 0.64);
    ring.position.set(0, -t * 0.14, zPos);
    abdGroup.add(ring);
  }
  root.add(abdGroup);
  reg.registerPart('bee_abdomen', abdGroup, new THREE.Vector3(0, 0.15, -0.78));

  // --- 7. Stinger Apparatus ---
  const stingerGroup = new THREE.Group();
  stingerGroup.position.set(0, 0.88, -1.24);
  const lancet = new THREE.Mesh(
    new THREE.ConeGeometry(0.032, 0.34, 12),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.24, metalness: 0.35 })
  );
  lancet.rotation.x = -Math.PI / 2 - 0.15;
  lancet.position.set(0, -0.02, -0.14);
  const venomSac = new THREE.Mesh(
    new THREE.SphereGeometry(0.072, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: 0xfef08a, roughness: 0.3, clearcoat: 0.5 })
  );
  venomSac.position.set(0, 0.02, 0.05);
  stingerGroup.add(lancet, venomSac);
  root.add(stingerGroup);
  reg.registerPart('bee_stinger', stingerGroup, new THREE.Vector3(0, -0.08, -1.25));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const flap = Math.sin(elapsed * 22) * 0.22;
      leftWingPivot.rotation.z = flap;
      rightWingPivot.rotation.z = -flap;
      antGroup.rotation.x = Math.sin(elapsed * 4.5) * 0.06;
    },
  };
}

// ============================================================================
// 3. FLOWERING PLANT SPECIMEN (7 composite botanical sub-groups)
// ============================================================================

function buildPlantSpecimen(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  const leafTex = createLeafVeinTexture(maxAniso);
  reg.textures.push(leafTex);

  // Translucent soil disc base
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x3f2e21,
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const soilMound = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.92, 0.14, 32), soilMat);
  soilMound.position.y = 0.46;
  soilMound.renderOrder = 3;
  root.add(soilMound);
  reg.shellMeshes.push(soilMound);

  // --- 1. Root System (Taproot + 6 lateral fibrous roots) ---
  const rootsGroup = new THREE.Group();
  const rootMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.85, metalness: 0.0 });
  const tapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.52, 0),
    new THREE.Vector3(0.04, 0.3, 0.02),
    new THREE.Vector3(-0.02, 0.06, 0),
  ]);
  rootsGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tapCurve, 16, 0.052, 10, false), rootMat));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const latCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.46 - (i % 3) * 0.08, 0),
      new THREE.Vector3(Math.cos(a) * 0.34, 0.25, Math.sin(a) * 0.34),
      new THREE.Vector3(Math.cos(a + 0.3) * 0.64, 0.05, Math.sin(a + 0.3) * 0.64),
    ]);
    rootsGroup.add(new THREE.Mesh(new THREE.TubeGeometry(latCurve, 16, 0.022, 8, false), rootMat));
  }
  root.add(rootsGroup);
  reg.registerPart('plant_roots', rootsGroup, new THREE.Vector3(0, -0.35, 0));

  // --- 2. Vascular Stem ---
  const stemGroup = new THREE.Group();
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.56, metalness: 0.02 });
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.5, 0),
    new THREE.Vector3(0.04, 1.15, 0.02),
    new THREE.Vector3(-0.03, 1.85, -0.02),
    new THREE.Vector3(0, 2.38, 0),
  ]);
  const stemMesh = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 28, 0.062, 12, false), stemMat);
  stemGroup.add(stemMesh);
  [1.08, 1.56, 2.34].forEach((ny) => {
    const nodeCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.015, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.42 })
    );
    nodeCollar.rotation.x = Math.PI / 2;
    nodeCollar.position.set(0, ny, 0);
    stemGroup.add(nodeCollar);
  });
  root.add(stemGroup);
  reg.registerPart('plant_stem', stemGroup, new THREE.Vector3(-0.55, 0, 0));

  // --- 3. Photosynthetic Leaves (4 sculpted veined blades) ---
  const leavesGroup = new THREE.Group();
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.28, 0.14, 0.58, 0.22, 0.88, 0);
  leafShape.bezierCurveTo(0.58, -0.22, 0.28, -0.14, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  const leafMat = new THREE.MeshPhysicalMaterial({
    map: leafTex,
    roughness: 0.44,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  });

  const leafSpecs = [
    { y: 1.08, rotY: 0.2, tilt: 0.32 },
    { y: 1.32, rotY: Math.PI + 0.3, tilt: 0.28 },
    { y: 1.56, rotY: Math.PI / 2 + 0.1, tilt: 0.36 },
    { y: 1.76, rotY: -Math.PI / 2 - 0.15, tilt: 0.25 },
  ];
  leafSpecs.forEach((spec) => {
    const leafPivot = new THREE.Group();
    leafPivot.position.set(0, spec.y, 0);
    leafPivot.rotation.y = spec.rotY;
    const blade = new THREE.Mesh(leafGeo, leafMat);
    blade.rotation.set(-Math.PI / 2 + spec.tilt, 0, 0);
    leafPivot.add(blade);
    leavesGroup.add(leafPivot);
  });
  root.add(leavesGroup);
  reg.registerPart('plant_leaves', leavesGroup, new THREE.Vector3(0.75, 0, 0.35));

  // --- 4. Calyx & Sepals ---
  const sepalsGroup = new THREE.Group();
  sepalsGroup.position.set(0, 2.38, 0);
  const sepalMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.52 });
  const receptacle = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), sepalMat);
  receptacle.scale.set(1.15, 0.65, 1.15);
  sepalsGroup.add(receptacle);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 8), sepalMat);
    sepal.position.set(Math.cos(a) * 0.24, -0.02, Math.sin(a) * 0.24);
    sepal.rotation.z = -Math.cos(a) * 1.15;
    sepal.rotation.x = Math.sin(a) * 1.15;
    sepalsGroup.add(sepal);
  }
  root.add(sepalsGroup);
  reg.registerPart('plant_sepals', sepalsGroup, new THREE.Vector3(0, -0.18, -0.65));

  // --- 5. Corolla (6 Layered Petals) ---
  const petalsGroup = new THREE.Group();
  petalsGroup.position.set(0, 2.46, 0);
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(0.22, 0.16, 0.32, 0.52, 0.12, 0.78);
  petalShape.bezierCurveTo(0.03, 0.85, -0.03, 0.85, -0.12, 0.78);
  petalShape.bezierCurveTo(-0.32, 0.52, -0.22, 0.16, 0, 0);
  const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  const petalMat = new THREE.MeshPhysicalMaterial({
    color: 0xec4899,
    roughness: 0.42,
    metalness: 0.0,
    sheen: 0.8,
    sheenColor: new THREE.Color(0xfbcfe8),
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const petalPivot = new THREE.Group();
    petalPivot.rotation.y = a;
    const petalMesh = new THREE.Mesh(petalGeo, petalMat);
    petalMesh.rotation.x = 0.88;
    petalMesh.position.set(0, 0, 0.06);
    petalPivot.add(petalMesh);
    petalsGroup.add(petalPivot);
  }
  root.add(petalsGroup);
  reg.registerPart('plant_petals', petalsGroup, new THREE.Vector3(0, 0.25, 0.72));

  // --- 6. Stamens (6 Filaments + Bilobed Anthers) ---
  const stamensGroup = new THREE.Group();
  stamensGroup.position.set(0, 2.48, 0);
  const filamentMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
  const antherMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.82 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const fCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09),
      new THREE.Vector3(Math.cos(a) * 0.18, 0.22, Math.sin(a) * 0.18),
      new THREE.Vector3(Math.cos(a) * 0.22, 0.42, Math.sin(a) * 0.22),
    ]);
    const filament = new THREE.Mesh(new THREE.TubeGeometry(fCurve, 12, 0.012, 8, false), filamentMat);
    const anther = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.06, 6, 10), antherMat);
    anther.position.set(Math.cos(a) * 0.22, 0.44, Math.sin(a) * 0.22);
    anther.rotation.z = Math.PI / 2;
    anther.rotation.y = a;
    stamensGroup.add(filament, anther);
  }
  root.add(stamensGroup);
  reg.registerPart('plant_stamens', stamensGroup, new THREE.Vector3(0.65, 0.6, 0));

  // --- 7. Pistil (Ovary, Style, Receptive Stigma) ---
  const pistilGroup = new THREE.Group();
  pistilGroup.position.set(0, 2.48, 0);
  const pistilProfile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.11, 0.08),
    new THREE.Vector2(0.115, 0.19),
    new THREE.Vector2(0.04, 0.34),
    new THREE.Vector2(0.032, 0.54),
    new THREE.Vector2(0.082, 0.62),
    new THREE.Vector2(0.01, 0.65),
  ];
  const carpelMesh = new THREE.Mesh(
    new THREE.LatheGeometry(pistilProfile, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xa3e635, roughness: 0.38, clearcoat: 0.4 })
  );
  const stigmaCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.72 })
  );
  stigmaCap.scale.set(1.2, 0.55, 1.2);
  stigmaCap.position.y = 0.64;
  pistilGroup.add(carpelMesh, stigmaCap);
  root.add(pistilGroup);
  reg.registerPart('plant_pistil', pistilGroup, new THREE.Vector3(0, 0.95, 0));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const sway = Math.sin(elapsed * 1.4) * 0.025;
      petalsGroup.rotation.z = sway;
      leavesGroup.rotation.z = sway * 0.7;
    },
  };
}

// ============================================================================
// 4. BONY FISH SPECIMEN (7 composite ichthyology sub-groups)
// ============================================================================

function buildFishSpecimen(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.75);

  const scaleTex = createFishScaleTexture(maxAniso);
  reg.textures.push(scaleTex);

  const finMat = new THREE.MeshPhysicalMaterial({
    color: 0x7dd3fc,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });

  // --- 1. Cranium & Sensory Eyes ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.08, 0.86);
  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0x0369a1,
    roughness: 0.25,
    metalness: 0.25,
    clearcoat: 0.6,
  });
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.32, 22, 18), headMat);
  snout.scale.set(0.68, 0.95, 1.35);
  const lowerJaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.38 })
  );
  lowerJaw.scale.set(0.7, 0.45, 1.2);
  lowerJaw.position.set(0, -0.14, 0.24);
  [-1, 1].forEach((side) => {
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 })
    );
    sclera.position.set(side * 0.16, 0.07, 0.16);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 14, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.08, clearcoat: 1 })
    );
    pupil.position.set(side * 0.19, 0.07, 0.18);
    headGroup.add(sclera, pupil);
  });
  headGroup.add(snout, lowerJaw);
  root.add(headGroup);
  reg.registerPart('fish_head', headGroup, new THREE.Vector3(0, 0.18, 0.85));

  // --- 2. Operculum & Gills ---
  const gillsGroup = new THREE.Group();
  gillsGroup.position.set(0, 1.08, 0.46);
  const gillMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.58, metalness: 0.02 });
  const opercMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.28,
    metalness: 0.4,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    for (let g = 0; g < 3; g++) {
      const gillArch = new THREE.Mesh(new THREE.TorusGeometry(0.16 - g * 0.022, 0.022, 8, 18, Math.PI * 0.78), gillMat);
      gillArch.rotation.y = side * (Math.PI / 2.2);
      gillArch.rotation.z = -Math.PI * 0.35;
      gillArch.position.set(side * 0.16, -0.02, -g * 0.055);
      gillsGroup.add(gillArch);
    }
    const operc = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14, 0, Math.PI), opercMat);
    operc.scale.set(0.32, 1.05, 0.85);
    operc.rotation.y = side * (Math.PI / 2);
    operc.position.set(side * 0.22, -0.01, -0.02);
    operc.renderOrder = 3;
    gillsGroup.add(operc);
  });
  root.add(gillsGroup);
  reg.registerPart('fish_gills', gillsGroup, new THREE.Vector3(0.68, 0, 0.2));

  // --- 3. Streamlined Trunk & Lateral Line ---
  const bodyGroup = new THREE.Group();
  bodyGroup.position.set(0, 1.08, -0.14);
  const trunkProfile = [
    new THREE.Vector2(0.01, -0.88),
    new THREE.Vector2(0.12, -0.78),
    new THREE.Vector2(0.28, -0.45),
    new THREE.Vector2(0.42, 0.02),
    new THREE.Vector2(0.41, 0.42),
    new THREE.Vector2(0.25, 0.75),
    new THREE.Vector2(0.01, 0.86),
  ];
  const trunkGeo = new THREE.LatheGeometry(trunkProfile, 30);
  trunkGeo.rotateX(Math.PI / 2);
  const trunkMat = new THREE.MeshPhysicalMaterial({
    map: scaleTex,
    roughness: 0.28,
    metalness: 0.32,
    clearcoat: 0.6,
    transparent: true,
    opacity: 0.86,
  });
  const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
  trunkMesh.scale.set(0.62, 1.02, 1.0);
  bodyGroup.add(trunkMesh);
  root.add(bodyGroup);
  reg.shellMeshes.push(trunkMesh);
  reg.registerPart('fish_body', bodyGroup, new THREE.Vector3(-0.68, 0, 0));

  // --- 4. Dorsal & Anal Fins ---
  const dorsalGroup = new THREE.Group();
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0, 0);
  dorsalShape.lineTo(0.22, 0.38);
  dorsalShape.bezierCurveTo(0.46, 0.44, 0.68, 0.28, 0.74, 0);
  dorsalShape.closePath();
  const dorsalGeo = new THREE.ExtrudeGeometry(dorsalShape, { depth: 0.014, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005 });
  const dorsalMesh = new THREE.Mesh(dorsalGeo, finMat);
  dorsalMesh.rotation.y = Math.PI / 2;
  dorsalMesh.position.set(-0.007, 1.44, 0.14);

  const analMesh = new THREE.Mesh(dorsalGeo, finMat);
  analMesh.scale.set(0.55, -0.62, 1);
  analMesh.rotation.y = Math.PI / 2;
  analMesh.position.set(-0.007, 0.76, -0.35);
  dorsalGroup.add(dorsalMesh, analMesh);
  root.add(dorsalGroup);
  reg.registerPart('fish_dorsal', dorsalGroup, new THREE.Vector3(0, 0.72, 0));

  // --- 5. Pectoral & Pelvic Fins ---
  const pectGroup = new THREE.Group();
  const pFinShape = new THREE.Shape();
  pFinShape.moveTo(0, 0);
  pFinShape.bezierCurveTo(0.18, 0.12, 0.42, 0.14, 0.46, -0.05);
  pFinShape.bezierCurveTo(0.32, -0.18, 0.12, -0.12, 0, 0);
  const pFinGeo = new THREE.ExtrudeGeometry(pFinShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004 });
  const pectLeftPivot = new THREE.Group();
  pectLeftPivot.position.set(-0.22, 0.96, 0.34);
  const pLeft = new THREE.Mesh(pFinGeo, finMat);
  pLeft.rotation.set(0.2, Math.PI - 0.45, -0.15);
  pectLeftPivot.add(pLeft);

  const pectRightPivot = new THREE.Group();
  pectRightPivot.position.set(0.22, 0.96, 0.34);
  const pRight = new THREE.Mesh(pFinGeo, finMat);
  pRight.rotation.set(0.2, 0.45, 0.15);
  pectRightPivot.add(pRight);

  const pelvicLeft = new THREE.Mesh(pFinGeo, finMat);
  pelvicLeft.scale.set(0.62, 0.62, 1);
  pelvicLeft.position.set(-0.08, 0.72, 0.1);
  pelvicLeft.rotation.set(0.4, Math.PI - 0.9, -0.6);
  const pelvicRight = new THREE.Mesh(pFinGeo, finMat);
  pelvicRight.scale.set(0.62, 0.62, 1);
  pelvicRight.position.set(0.08, 0.72, 0.1);
  pelvicRight.rotation.set(0.4, 0.9, 0.6);

  pectGroup.add(pectLeftPivot, pectRightPivot, pelvicLeft, pelvicRight);
  root.add(pectGroup);
  reg.registerPart('fish_pectoral', pectGroup, new THREE.Vector3(0, -0.45, 0.35));

  // --- 6. Caudal (Tail) Fin ---
  const caudalGroup = new THREE.Group();
  caudalGroup.position.set(0, 1.08, -0.96);
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(-0.56, 0.46);
  tailShape.bezierCurveTo(-0.32, 0.14, -0.32, -0.14, -0.56, -0.46);
  tailShape.closePath();
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.016, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005 });
  const tailMesh = new THREE.Mesh(tailGeo, finMat);
  tailMesh.rotation.y = Math.PI / 2;
  tailMesh.position.set(-0.008, 0, 0);
  caudalGroup.add(tailMesh);
  root.add(caudalGroup);
  reg.registerPart('fish_caudal', caudalGroup, new THREE.Vector3(0, 0, -0.85));

  // --- 7. Swim Bladder (Internal gas sac) ---
  const bladderGroup = new THREE.Group();
  bladderGroup.position.set(0, 1.15, -0.05);
  const bladderSac = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.11, 0.42, 10, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0xfef08a,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.85,
      emissive: new THREE.Color(0x854d0e),
      emissiveIntensity: 0.25,
    })
  );
  bladderSac.rotation.x = Math.PI / 2;
  const pneumaticDuct = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.24, 10),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 })
  );
  pneumaticDuct.position.set(0, -0.08, 0.22);
  pneumaticDuct.rotation.x = 0.8;
  bladderGroup.add(bladderSac, pneumaticDuct);
  root.add(bladderGroup);
  reg.registerPart('fish_swim_bladder', bladderGroup, new THREE.Vector3(0.75, 0.52, 0));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      caudalGroup.rotation.y = Math.sin(elapsed * 4.2) * 0.26;
      pectLeftPivot.rotation.y = Math.sin(elapsed * 3.1) * 0.18;
      pectRightPivot.rotation.y = -Math.sin(elapsed * 3.1) * 0.18;
    },
  };
}

// ============================================================================
// Public Builder & Disposal Utilities
// ============================================================================

export function buildSpecimen(organismId: OrganismId, maxAniso: number): SpecimenBuildResult {
  switch (organismId) {
    case 'human':
      return buildHumanSpecimen(maxAniso);
    case 'bee':
      return buildBeeSpecimen(maxAniso);
    case 'plant':
      return buildPlantSpecimen(maxAniso);
    case 'fish':
      return buildFishSpecimen(maxAniso);
    default: {
      const specializedHuman = buildHumanSpecializedOrgan(organismId, maxAniso);
      if (specializedHuman) return specializedHuman;
      const microbeOrPlant = buildMicrobeOrPlantSpecimen(organismId, maxAniso);
      if (microbeOrPlant) return microbeOrPlant;
      const animalOrArthropod = buildAnimalOrArthropodSpecimen(organismId, maxAniso);
      if (animalOrArthropod) return animalOrArthropod;
      return buildHumanSpecimen(maxAniso);
    }
  }
}

export function disposeSpecimen(built: SpecimenBuildResult | null) {
  if (!built) return;
  built.root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    }
  });
  built.textures.forEach((t) => t.dispose());
}
