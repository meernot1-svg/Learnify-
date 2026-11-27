import * as THREE from 'three';
import {
  PartRegistry,
  SpecimenBuildResult,
  addPedestal,
  createBrainBumpTexture,
  createTissueMicroTexture,
} from './anatomyBuilder';

const _organDummy = new THREE.Object3D();
const _organPt = new THREE.Vector3();

function buildHumanBrain(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.45);
  const bump = createBrainBumpTexture(maxAniso);
  reg.textures.push(bump);

  const cortexMat = (color: number) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.52,
      metalness: 0.0,
      bumpMap: bump,
      bumpScale: 0.045,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
    });

  // 1. Frontal Lobe
  const frontalGroup = new THREE.Group();
  frontalGroup.position.set(0, 1.38, 0.34);
  [-1, 1].forEach((side) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 26, 20), cortexMat(0xf4a28c));
    lobe.scale.set(0.82, 0.92, 1.15);
    lobe.position.set(side * 0.2, 0, 0);
    frontalGroup.add(lobe);
  });
  root.add(frontalGroup);
  reg.registerPart('frontal_lobe', frontalGroup, new THREE.Vector3(0, 0.25, 0.72));

  // 2. Parietal & Occipital Lobes
  const parGroup = new THREE.Group();
  parGroup.position.set(0, 1.44, -0.26);
  [-1, 1].forEach((side) => {
    const par = new THREE.Mesh(new THREE.SphereGeometry(0.32, 26, 20), cortexMat(0xfb7185));
    par.scale.set(0.84, 0.94, 1.12);
    par.position.set(side * 0.2, 0.04, 0.02);
    const occ = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), cortexMat(0xf43f5e));
    occ.scale.set(0.88, 0.85, 1.05);
    occ.position.set(side * 0.16, -0.14, -0.24);
    parGroup.add(par, occ);
  });
  root.add(parGroup);
  reg.registerPart('parietal_occipital', parGroup, new THREE.Vector3(0, 0.42, -0.68));

  // 3. Temporal Lobes & Hippocampus
  const tempGroup = new THREE.Group();
  tempGroup.position.set(0, 1.14, 0.04);
  [-1, 1].forEach((side) => {
    const temp = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 10, 18), cortexMat(0xe879f9));
    temp.rotation.x = Math.PI / 2 - 0.15;
    temp.position.set(side * 0.41, 0, 0.02);
    const hippoCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.14, 0.04, 0.14),
      new THREE.Vector3(side * 0.2, -0.02, -0.04),
      new THREE.Vector3(side * 0.12, 0.08, -0.18),
    ]);
    const hippo = new THREE.Mesh(
      new THREE.TubeGeometry(hippoCurve, 14, 0.036, 10, false),
      new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.4 })
    );
    tempGroup.add(temp, hippo);
  });
  root.add(tempGroup);
  reg.registerPart('temporal_lobe', tempGroup, new THREE.Vector3(0.65, -0.15, 0));

  // 4. Cerebellum
  const cereGroup = new THREE.Group();
  cereGroup.position.set(0, 0.94, -0.36);
  [-1, 1].forEach((side) => {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.21, 22, 18), cortexMat(0xd97757));
    h.scale.set(0.92, 0.72, 0.88);
    h.position.set(side * 0.16, 0, 0);
    cereGroup.add(h);
  });
  root.add(cereGroup);
  reg.registerPart('cerebellum', cereGroup, new THREE.Vector3(0, -0.25, -0.7));

  // 5. Brainstem (Pons & Medulla)
  const stemGroup = new THREE.Group();
  stemGroup.position.set(0, 0.76, -0.06);
  const pons = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.55 })
  );
  pons.scale.set(1.1, 0.95, 1.05);
  pons.position.set(0, 0.16, 0.04);
  const medulla = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.06, 0.44, 16),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 })
  );
  medulla.position.set(0, -0.1, -0.02);
  medulla.rotation.x = 0.22;
  stemGroup.add(pons, medulla);
  root.add(stemGroup);
  reg.registerPart('brainstem', stemGroup, new THREE.Vector3(0, -0.45, 0.25));

  // 6. Corpus Callosum & Thalamus
  const ccGroup = new THREE.Group();
  ccGroup.position.set(0, 1.32, 0.04);
  const ccCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.02, 0.24),
    new THREE.Vector3(0, 0.12, 0.08),
    new THREE.Vector3(0, 0.12, -0.12),
    new THREE.Vector3(0, -0.04, -0.24),
  ]);
  const ccMesh = new THREE.Mesh(
    new THREE.TubeGeometry(ccCurve, 22, 0.065, 12, false),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
  );
  ccMesh.scale.set(2.1, 0.75, 1);
  const thalamus = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 14),
    new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.5 })
  );
  thalamus.scale.set(1.3, 0.85, 1.25);
  thalamus.position.set(0, -0.05, -0.02);
  ccGroup.add(ccMesh, thalamus);
  root.add(ccGroup);
  reg.registerPart('corpus_callosum', ccGroup, new THREE.Vector3(-0.65, 0.55, 0));

  // Animated neural action-potential sparks propagating along cortical pathways
  const pathwayA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.72, -0.06),
    new THREE.Vector3(0, 1.28, 0.02),
    new THREE.Vector3(-0.26, 1.44, 0.25),
    new THREE.Vector3(-0.36, 1.24, -0.25),
    new THREE.Vector3(0, 0.94, -0.35),
  ]);
  const pathwayB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.72, -0.06),
    new THREE.Vector3(0, 1.32, 0.04),
    new THREE.Vector3(0.28, 1.42, 0.22),
    new THREE.Vector3(0.36, 1.2, -0.22),
    new THREE.Vector3(0, 0.96, -0.34),
  ]);
  const neuralCount = 16;
  const neuralSparks = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.024, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    neuralCount
  );
  neuralSparks.frustumCulled = false;
  root.add(neuralSparks);

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const pulse = 1 + Math.sin(elapsed * 2.2) * 0.012;
      root.scale.set(pulse, 1, pulse);
      for (let i = 0; i < neuralCount; i++) {
        const curve = i % 2 === 0 ? pathwayA : pathwayB;
        const u = (elapsed * 0.45 + i / neuralCount) % 1;
        curve.getPointAt(u, _organPt);
        _organDummy.position.copy(_organPt);
        _organDummy.scale.setScalar(0.7 + 0.55 * Math.sin(elapsed * 7 + i));
        _organDummy.updateMatrix();
        neuralSparks.setMatrixAt(i, _organDummy.matrix);
      }
      neuralSparks.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildHumanHeart(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.4);
  const tissueTex = createTissueMicroTexture(maxAniso);
  reg.textures.push(tissueTex);

  const muscleMat = (color: number) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.34,
      metalness: 0.04,
      bumpMap: tissueTex,
      bumpScale: 0.018,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xfecaca),
    });

  // 1. Left Ventricle
  const lvGroup = new THREE.Group();
  lvGroup.position.set(0.14, 1.02, 0.04);
  const lvGeo = new THREE.SphereGeometry(0.29, 26, 22);
  const lvMesh = new THREE.Mesh(lvGeo, muscleMat(0xdc2626));
  lvMesh.scale.set(0.86, 1.48, 0.9);
  lvMesh.rotation.z = 0.32;
  lvGroup.add(lvMesh);
  root.add(lvGroup);
  reg.registerPart('left_ventricle', lvGroup, new THREE.Vector3(0.55, -0.2, 0.35));

  // 2. Right Ventricle
  const rvGroup = new THREE.Group();
  rvGroup.position.set(-0.14, 1.06, 0.14);
  const rvMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 20), muscleMat(0xb91c1c));
  rvMesh.scale.set(0.92, 1.28, 0.78);
  rvMesh.rotation.z = 0.26;
  rvGroup.add(rvMesh);
  root.add(rvGroup);
  reg.registerPart('right_ventricle', rvGroup, new THREE.Vector3(-0.52, -0.15, 0.55));

  // 3. Atria
  const atriaGroup = new THREE.Group();
  atriaGroup.position.set(0, 1.42, 0.02);
  const rightAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), muscleMat(0xef4444));
  rightAtrium.position.set(-0.22, -0.02, 0.04);
  const leftAtrium = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 16), muscleMat(0xf87171));
  leftAtrium.position.set(0.18, 0.02, -0.06);
  atriaGroup.add(rightAtrium, leftAtrium);
  root.add(atriaGroup);
  reg.registerPart('atria', atriaGroup, new THREE.Vector3(0, 0.45, -0.35));

  // 4. Aorta & Carotid Branches
  const aortaGroup = new THREE.Group();
  aortaGroup.position.set(0.02, 1.46, 0.02);
  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0, 0.04),
    new THREE.Vector3(0.04, 0.34, 0.06),
    new THREE.Vector3(-0.08, 0.42, -0.08),
    new THREE.Vector3(-0.12, 0.05, -0.22),
  ]);
  const aortaTube = new THREE.Mesh(
    new THREE.TubeGeometry(archCurve, 28, 0.085, 14, false),
    muscleMat(0xef4444)
  );
  [-0.07, 0.0, 0.07].forEach((xOff, i) => {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.032, 0.24, 12),
      muscleMat(0xf87171)
    );
    branch.position.set(xOff, 0.5, 0.01 - i * 0.03);
    branch.rotation.z = -xOff * 1.4;
    aortaGroup.add(branch);
  });
  aortaGroup.add(aortaTube);
  root.add(aortaGroup);
  reg.registerPart('aortic_arch', aortaGroup, new THREE.Vector3(0.15, 0.72, 0));

  // 5. Vena Cava & Pulmonary Trunk
  const vcGroup = new THREE.Group();
  vcGroup.position.set(-0.22, 1.45, -0.02);
  const veinMat = muscleMat(0x2563eb);
  const svc = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.072, 0.46, 14), veinMat);
  svc.position.set(-0.08, 0.24, -0.02);
  const pulmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, -0.08, 0.16),
    new THREE.Vector3(0.16, 0.18, 0.1),
    new THREE.Vector3(0.36, 0.22, -0.04),
  ]);
  const pulmTrunk = new THREE.Mesh(new THREE.TubeGeometry(pulmCurve, 18, 0.062, 12, false), veinMat);
  const pulmLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.048, 0.34, 12),
    veinMat
  );
  pulmLeft.rotation.z = Math.PI / 2;
  pulmLeft.position.set(0.02, 0.22, 0.04);
  vcGroup.add(svc, pulmTrunk, pulmLeft);
  root.add(vcGroup);
  reg.registerPart('vena_cava_pulm', vcGroup, new THREE.Vector3(-0.68, 0.42, 0));

  // 6. Coronary Vessels
  const corGroup = new THREE.Group();
  corGroup.position.set(0, 1.15, 0.24);
  const corMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.35 });
  const cCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0.28, 0.02),
    new THREE.Vector3(0.04, 0.08, 0.09),
    new THREE.Vector3(0.11, -0.18, 0.05),
    new THREE.Vector3(0.18, -0.34, -0.03),
  ]);
  const cCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0.24, 0.02),
    new THREE.Vector3(-0.14, 0.08, 0.06),
    new THREE.Vector3(-0.22, -0.12, -0.02),
  ]);
  corGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(cCurve1, 20, 0.014, 8, false), corMat),
    new THREE.Mesh(new THREE.TubeGeometry(cCurve2, 16, 0.012, 8, false), corMat)
  );
  root.add(corGroup);
  reg.registerPart('coronary_vessels', corGroup, new THREE.Vector3(0.1, 0, 0.78));

  // Oxygenated & Deoxygenated Erythrocyte Flow through Aorta & Pulmonary Trunk
  const aorticStream = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.12, 1.12, 0.04),
    new THREE.Vector3(0.0, 1.46, 0.06),
    new THREE.Vector3(0.06, 1.8, 0.08),
    new THREE.Vector3(-0.06, 1.88, -0.06),
    new THREE.Vector3(-0.1, 1.5, -0.2),
  ]);
  const venousStream = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 1.82, -0.04),
    new THREE.Vector3(-0.24, 1.42, 0.02),
    new THREE.Vector3(-0.12, 1.12, 0.14),
    new THREE.Vector3(-0.06, 1.62, 0.12),
    new THREE.Vector3(0.16, 1.67, -0.04),
  ]);
  const rbcGeo = new THREE.SphereGeometry(0.032, 10, 8);
  rbcGeo.scale(1.15, 0.6, 1.15);
  const artCount = 16;
  const artFlow = new THREE.InstancedMesh(
    rbcGeo,
    new THREE.MeshBasicMaterial({ color: 0xfb7185 }),
    artCount
  );
  artFlow.frustumCulled = false;
  const venCount = 14;
  const venFlow = new THREE.InstancedMesh(
    rbcGeo,
    new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
    venCount
  );
  venFlow.frustumCulled = false;
  root.add(artFlow, venFlow);

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const t = (elapsed * 1.18) % 1;
      const atrialBeat = Math.exp(-Math.pow((t - 0.07) / 0.048, 2));
      const lub = Math.exp(-Math.pow((t - 0.17) / 0.055, 2));
      const dub = 0.65 * Math.exp(-Math.pow((t - 0.36) / 0.05, 2));
      const s = 1 + (lub + dub) * 0.075;
      lvMesh.scale.set(0.86 * s, 1.48 * (1 - lub * 0.04 + dub * 0.03), 0.9 * s);
      rvMesh.scale.set(0.92 * s, 1.28 * (1 - lub * 0.04), 0.78 * s);
      atriaGroup.scale.setScalar(1 + atrialBeat * 0.11);

      for (let i = 0; i < artCount; i++) {
        const u = (elapsed * 0.42 + lub * 0.04 + i / artCount) % 1;
        aorticStream.getPointAt(u, _organPt);
        _organDummy.position.copy(_organPt);
        _organDummy.scale.setScalar(0.85 + lub * 0.25);
        _organDummy.updateMatrix();
        artFlow.setMatrixAt(i, _organDummy.matrix);
      }
      artFlow.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < venCount; i++) {
        const u = (elapsed * 0.34 + i / venCount) % 1;
        venousStream.getPointAt(u, _organPt);
        _organDummy.position.copy(_organPt);
        _organDummy.scale.setScalar(0.9);
        _organDummy.updateMatrix();
        venFlow.setMatrixAt(i, _organDummy.matrix);
      }
      venFlow.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildHumanLungs(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  // 1. Larynx & Trachea
  const trachGroup = new THREE.Group();
  trachGroup.position.set(0, 1.88, 0);
  const cartMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38 });
  const larynx = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.2, 16), cartMat);
  larynx.position.y = 0.32;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.56, 16), cartMat);
  trachGroup.add(larynx, tube);
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.012, 8, 22), cartMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.22 + i * 0.065;
    trachGroup.add(ring);
  }
  root.add(trachGroup);
  reg.registerPart('larynx_trachea', trachGroup, new THREE.Vector3(0, 0.68, 0));

  // 2. Bronchial Tree
  const bronGroup = new THREE.Group();
  bronGroup.position.set(0, 1.38, 0);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.42 });
  [-1, 1].forEach((side) => {
    const main = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.24, 0),
      new THREE.Vector3(side * 0.24, 0.08, 0),
      new THREE.Vector3(side * 0.46, -0.14, 0.03),
    ]);
    bronGroup.add(new THREE.Mesh(new THREE.TubeGeometry(main, 14, 0.042, 10, false), bMat));
    [0.14, -0.08, -0.26].forEach((yOff, idx) => {
      const sub = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.28, 0.04, 0),
        new THREE.Vector3(side * (0.48 + idx * 0.05), yOff, (idx - 1) * 0.08),
      ]);
      bronGroup.add(new THREE.Mesh(new THREE.TubeGeometry(sub, 10, 0.022, 8, false), bMat));
    });
  });
  root.add(bronGroup);
  reg.registerPart('bronchial_tree', bronGroup, new THREE.Vector3(0, 0.2, 0.62));

  // 3. Right Lung (3 lobes)
  const rightGroup = new THREE.Group();
  rightGroup.position.set(-0.46, 1.18, 0.02);
  const rMat = new THREE.MeshPhysicalMaterial({
    color: 0xfb7185,
    roughness: 0.52,
    clearcoat: 0.25,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const rSup = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 18), rMat);
  rSup.scale.set(0.92, 1.15, 0.95);
  rSup.position.set(0.02, 0.22, 0);
  const rMid = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), rMat);
  rMid.scale.set(0.95, 0.85, 0.96);
  rMid.position.set(-0.02, -0.06, 0.04);
  const rInf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 22, 18), rMat);
  rInf.scale.set(0.98, 0.92, 0.96);
  rInf.position.set(-0.02, -0.32, -0.02);
  rightGroup.add(rSup, rMid, rInf);
  root.add(rightGroup);
  reg.shellMeshes.push(rSup, rMid, rInf);
  reg.registerPart('right_lung', rightGroup, new THREE.Vector3(-0.78, 0.1, 0));

  // 4. Left Lung (2 lobes + notch)
  const leftGroup = new THREE.Group();
  leftGroup.position.set(0.46, 1.18, 0.02);
  const lMat = rMat.clone();
  lMat.color.setHex(0xf43f5e);
  const lSup = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), lMat);
  lSup.scale.set(0.88, 1.25, 0.94);
  lSup.position.set(0.02, 0.18, 0);
  const lInf = new THREE.Mesh(new THREE.SphereGeometry(0.27, 22, 18), lMat);
  lInf.scale.set(0.92, 1.05, 0.94);
  lInf.position.set(0.04, -0.24, -0.02);
  leftGroup.add(lSup, lInf);
  root.add(leftGroup);
  reg.shellMeshes.push(lSup, lInf);
  reg.registerPart('left_lung', leftGroup, new THREE.Vector3(0.78, 0.1, 0));

  // 5. Diaphragm
  const diaGroup = new THREE.Group();
  diaGroup.position.set(0, 0.64, 0.02);
  const diaMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.76, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.55, side: THREE.DoubleSide })
  );
  diaMesh.scale.set(1.02, 0.45, 0.62);
  diaGroup.add(diaMesh);
  root.add(diaGroup);
  reg.registerPart('diaphragm', diaGroup, new THREE.Vector3(0, -0.42, 0));

  // Oxygenated Airflow Molecules descending Larynx -> Trachea -> Bronchi
  const leftAirPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.34, 0),
    new THREE.Vector3(0, 1.72, 0),
    new THREE.Vector3(-0.24, 1.44, 0),
    new THREE.Vector3(-0.48, 1.18, 0.02),
  ]);
  const rightAirPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.34, 0),
    new THREE.Vector3(0, 1.72, 0),
    new THREE.Vector3(0.24, 1.44, 0),
    new THREE.Vector3(0.48, 1.18, 0.02),
  ]);
  const airCount = 18;
  const airParticles = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.022, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    airCount
  );
  airParticles.frustumCulled = false;
  root.add(airParticles);

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const breath = Math.sin(elapsed * 1.65);
      const tidal = 0.5 + 0.5 * breath;
      const s = 1 + breath * 0.055;
      rightGroup.scale.set(s, 1 + breath * 0.025, s);
      leftGroup.scale.set(s, 1 + breath * 0.025, s);
      diaGroup.position.y = 0.64 - tidal * 0.07;
      diaMesh.scale.y = 0.48 - tidal * 0.12;

      for (let i = 0; i < airCount; i++) {
        const path = i % 2 === 0 ? leftAirPath : rightAirPath;
        // Oscillate inward on inhale, outward on exhale
        const phase = (elapsed * 0.52 + i / airCount) % 1;
        const u = breath >= 0 ? phase : 1 - phase;
        path.getPointAt(Math.min(1, Math.max(0, u)), _organPt);
        _organDummy.position.copy(_organPt);
        _organDummy.scale.setScalar(0.75 + tidal * 0.4);
        _organDummy.updateMatrix();
        airParticles.setMatrixAt(i, _organDummy.matrix);
      }
      airParticles.instanceMatrix.needsUpdate = true;
    },
  };
}

function buildHumanSkeleton(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xebe4d4, roughness: 0.5, metalness: 0.06 });

  // 1. Cranium & Jaw
  const skullGroup = new THREE.Group();
  skullGroup.position.set(0, 2.98, 0.04);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.22, 22, 18), boneMat);
  cranium.scale.set(0.88, 1.08, 1.05);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.2), boneMat);
  jaw.position.set(0, -0.18, 0.08);
  [-1, 1].forEach((side) => {
    const orbit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    orbit.rotation.x = Math.PI / 2;
    orbit.position.set(side * 0.08, -0.02, 0.19);
    skullGroup.add(orbit);
  });
  skullGroup.add(cranium, jaw);
  root.add(skullGroup);
  reg.registerPart('cranium_jaw', skullGroup, new THREE.Vector3(0, 0.65, 0));

  // 2. Vertebral Column
  const spineGroup = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.072, 12), boneMat);
    v.position.set(0, 1.38 + i * 0.095, -0.14 + Math.sin(i * 0.35) * 0.03);
    spineGroup.add(v);
  }
  root.add(spineGroup);
  reg.registerPart('vertebral_column', spineGroup, new THREE.Vector3(0, 0, -0.78));

  // 3. Ribcage & Sternum
  const ribGroup = new THREE.Group();
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.028), boneMat);
  sternum.position.set(0, 2.24, 0.25);
  ribGroup.add(sternum);
  for (let r = 0; r < 7; r++) {
    const y = 2.48 - r * 0.08;
    const w = 0.28 + Math.sin((r / 6) * Math.PI) * 0.09;
    [-1, 1].forEach((side) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.03, y, -0.14),
        new THREE.Vector3(side * w, y - 0.02, 0.04),
        new THREE.Vector3(side * (w * 0.56), y - 0.05, 0.23),
        new THREE.Vector3(side * 0.03, y - 0.04, 0.25),
      ]);
      ribGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.015, 8, false), boneMat));
    });
  }
  root.add(ribGroup);
  reg.registerPart('thoracic_cage', ribGroup, new THREE.Vector3(0, 0.15, 0.72));

  // 4. Upper Limbs
  const upperGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const clav = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 10), boneMat);
    clav.rotation.z = side * (Math.PI / 2 - 0.15);
    clav.position.set(side * 0.22, 2.55, 0.1);
    const hum = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.024, 0.58, 12), boneMat);
    hum.position.set(side * 0.44, 2.22, 0);
    hum.rotation.z = side * 0.12;
    const rad = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.5, 10), boneMat);
    rad.position.set(side * 0.52, 1.72, 0.04);
    const uln = rad.clone();
    uln.position.x = side * 0.48;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.04), boneMat);
    hand.position.set(side * 0.52, 1.38, 0.05);
    upperGroup.add(clav, hum, rad, uln, hand);
  });
  root.add(upperGroup);
  reg.registerPart('upper_limbs', upperGroup, new THREE.Vector3(0.7, 0.1, 0));

  // 5. Pelvis
  const pelvGroup = new THREE.Group();
  pelvGroup.position.set(0, 1.38, 0);
  const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.044, 10, 26), boneMat);
  pRing.rotation.x = Math.PI / 2.2;
  pRing.scale.set(1.25, 0.75, 1);
  pelvGroup.add(pRing);
  root.add(pelvGroup);
  reg.registerPart('pelvis_girdle', pelvGroup, new THREE.Vector3(-0.7, 0, 0));

  // 6. Lower Limbs
  const lowerGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.68, 12), boneMat);
    femur.position.set(side * 0.18, 0.98, 0);
    femur.rotation.z = side * -0.06;
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.62, 12), boneMat);
    tibia.position.set(side * 0.15, 0.34, 0.01);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.24), boneMat);
    foot.position.set(side * 0.15, 0.04, 0.08);
    lowerGroup.add(femur, tibia, foot);
  });
  root.add(lowerGroup);
  reg.registerPart('lower_limbs', lowerGroup, new THREE.Vector3(0, -0.45, 0.4));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      ribGroup.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.016);
    },
  };
}

function buildHumanDigestive(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  // 1. Esophagus
  const esoGroup = new THREE.Group();
  const eso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.055, 0.78, 16),
    new THREE.MeshStandardMaterial({ color: 0xe07a5f, roughness: 0.55 })
  );
  eso.position.set(0.02, 2.02, -0.04);
  esoGroup.add(eso);
  root.add(esoGroup);
  reg.registerPart('esophagus', esoGroup, new THREE.Vector3(0, 0.62, 0));

  // 2. Stomach
  const stomGroup = new THREE.Group();
  stomGroup.position.set(0.18, 1.48, 0.04);
  const sCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.14, 0.22, -0.02),
    new THREE.Vector3(-0.04, 0.08, 0.04),
    new THREE.Vector3(0.12, -0.04, 0.06),
    new THREE.Vector3(-0.02, -0.18, 0.04),
    new THREE.Vector3(-0.18, -0.1, 0),
  ]);
  const sMat = new THREE.MeshPhysicalMaterial({ color: 0xea8c55, roughness: 0.45, clearcoat: 0.35 });
  const sTube = new THREE.Mesh(new THREE.TubeGeometry(sCurve, 28, 0.11, 14, false), sMat);
  const fundus = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 16), sMat);
  fundus.position.set(0.08, 0.04, 0.04);
  stomGroup.add(sTube, fundus);
  root.add(stomGroup);
  reg.registerPart('stomach_sac', stomGroup, new THREE.Vector3(0.75, 0.12, 0.35));

  // 3. Liver & Gallbladder
  const liverGroup = new THREE.Group();
  liverGroup.position.set(-0.22, 1.52, 0.12);
  const livMat = new THREE.MeshPhysicalMaterial({ color: 0x7c2d12, roughness: 0.35, clearcoat: 0.45 });
  const rLobe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 18), livMat);
  rLobe.scale.set(1.35, 0.78, 0.85);
  rLobe.rotation.z = 0.24;
  const lLobe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 16), livMat);
  lLobe.scale.set(1.3, 0.6, 0.75);
  lLobe.position.set(0.24, 0.04, 0.02);
  const gb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35 })
  );
  gb.scale.set(0.8, 1.4, 0.8);
  gb.position.set(-0.02, -0.13, 0.08);
  liverGroup.add(rLobe, lLobe, gb);
  root.add(liverGroup);
  reg.registerPart('liver_gallbladder', liverGroup, new THREE.Vector3(-0.78, 0.15, 0.35));

  // 4. Pancreas
  const pancGroup = new THREE.Group();
  pancGroup.position.set(0.06, 1.24, -0.08);
  const panc = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.055, 0.32, 8, 14),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
  );
  panc.rotation.z = Math.PI / 2 - 0.15;
  pancGroup.add(panc);
  root.add(pancGroup);
  reg.registerPart('pancreas', pancGroup, new THREE.Vector3(0, 0, -0.78));

  // 5. Small Intestine
  const smGroup = new THREE.Group();
  smGroup.position.set(0, 0.82, 0.08);
  const smPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 36; i++) {
    const t = i / 36;
    smPts.push(
      new THREE.Vector3(
        Math.sin(t * Math.PI * 8) * 0.2,
        0.22 - t * 0.44,
        Math.cos(t * Math.PI * 7) * 0.08
      )
    );
  }
  const smMesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smPts), 72, 0.042, 12, false),
    new THREE.MeshStandardMaterial({ color: 0xf4a28c, roughness: 0.55 })
  );
  smGroup.add(smMesh);
  root.add(smGroup);
  reg.registerPart('small_intestine', smGroup, new THREE.Vector3(0, -0.1, 0.82));

  // 6. Large Intestine
  const lgGroup = new THREE.Group();
  lgGroup.position.set(0, 0.82, 0.06);
  const cPts = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, -0.26, 0.02),
    new THREE.Vector3(-0.32, 0.2, 0.04),
    new THREE.Vector3(0, 0.28, 0.08),
    new THREE.Vector3(0.32, 0.2, 0.04),
    new THREE.Vector3(0.28, -0.24, 0.02),
    new THREE.Vector3(0.02, -0.38, -0.04),
  ]);
  const colon = new THREE.Mesh(
    new THREE.TubeGeometry(cPts, 40, 0.072, 14, false),
    new THREE.MeshStandardMaterial({ color: 0xc26d53, roughness: 0.5 })
  );
  lgGroup.add(colon);
  root.add(lgGroup);
  reg.registerPart('large_intestine', lgGroup, new THREE.Vector3(0, -0.45, 0.45));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      smGroup.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.02);
      stomGroup.rotation.z = Math.sin(elapsed * 1.8) * 0.03;
    },
  };
}

function buildHumanEye(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.4);

  // 1. Sclera & Cornea Shell
  const scleraGroup = new THREE.Group();
  scleraGroup.position.set(0, 1.25, 0);
  const scleraMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.22,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 32, 24, 0, Math.PI * 2, 0.35, Math.PI * 0.8),
    scleraMat
  );
  sclera.rotation.x = Math.PI / 2;
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.48),
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      transmission: 0.72,
      transparent: true,
      opacity: 0.55,
      clearcoat: 1,
    })
  );
  cornea.rotation.x = Math.PI / 2;
  cornea.position.z = 0.52;
  scleraGroup.add(sclera, cornea);
  root.add(scleraGroup);
  reg.shellMeshes.push(sclera);
  reg.registerPart('cornea_sclera', scleraGroup, new THREE.Vector3(0, 0.35, 0.5));

  // 2. Iris & Pupil
  const irisGroup = new THREE.Group();
  irisGroup.position.set(0, 1.25, 0.56);
  const iris = new THREE.Mesh(
    new THREE.RingGeometry(0.11, 0.27, 32),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.45, side: THREE.DoubleSide })
  );
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 24),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, side: THREE.DoubleSide })
  );
  pupil.position.z = -0.005;
  irisGroup.add(iris, pupil);
  root.add(irisGroup);
  reg.registerPart('iris_pupil', irisGroup, new THREE.Vector3(0, 0, 0.85));

  // 3. Crystalline Lens
  const lensGroup = new THREE.Group();
  lensGroup.position.set(0, 1.25, 0.38);
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.08,
      clearcoat: 1,
      transparent: true,
      opacity: 0.82,
    })
  );
  lens.scale.set(1, 1, 0.48);
  lensGroup.add(lens);
  root.add(lensGroup);
  reg.registerPart('crystalline_lens', lensGroup, new THREE.Vector3(0.65, 0.2, 0.3));

  // 4. Vitreous Body
  const vitGroup = new THREE.Group();
  vitGroup.position.set(0, 1.25, -0.02);
  const vit = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 24, 20),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  vitGroup.add(vit);
  root.add(vitGroup);
  reg.registerPart('vitreous_body', vitGroup, new THREE.Vector3(-0.68, 0.15, 0));

  // 5. Retina & Macula
  const retGroup = new THREE.Group();
  retGroup.position.set(0, 1.25, -0.04);
  const retina = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 26, 20, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.56),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55, side: THREE.DoubleSide })
  );
  retina.rotation.x = Math.PI / 2;
  const macula = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 16, 14),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
  );
  macula.position.set(0, 0, -0.58);
  retGroup.add(retina, macula);
  root.add(retGroup);
  reg.registerPart('retina_macula', retGroup, new THREE.Vector3(0, -0.25, -0.68));

  // 6. Optic Nerve
  const opticGroup = new THREE.Group();
  opticGroup.position.set(0.12, 1.22, -0.82);
  const nerve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 0.52, 16),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.48 })
  );
  nerve.rotation.x = Math.PI / 2;
  opticGroup.add(nerve);
  root.add(opticGroup);
  reg.registerPart('optic_nerve', opticGroup, new THREE.Vector3(0.25, 0, -0.92));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const pScale = 1 + Math.sin(elapsed * 2.0) * 0.12;
      pupil.scale.set(pScale, pScale, 1);
    },
  };
}

function buildHumanEar(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  // 1. Pinna & Canal
  const pinnaGroup = new THREE.Group();
  pinnaGroup.position.set(-0.78, 1.25, 0);
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3b79b, roughness: 0.6 });
  const pinnaRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 12, 26), skinMat);
  pinnaRim.scale.set(0.75, 1.35, 0.7);
  pinnaRim.rotation.y = Math.PI / 2;
  const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.66, 16), skinMat);
  canal.rotation.z = Math.PI / 2;
  canal.position.set(0.34, 0, 0);
  pinnaGroup.add(pinnaRim, canal);
  root.add(pinnaGroup);
  reg.registerPart('pinna_canal', pinnaGroup, new THREE.Vector3(-0.75, 0, 0));

  // 2. Tympanic Membrane
  const tympGroup = new THREE.Group();
  tympGroup.position.set(-0.1, 1.25, 0);
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.02, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xfda4af, roughness: 0.35, transparent: true, opacity: 0.85 })
  );
  drum.rotation.z = Math.PI / 2;
  tympGroup.add(drum);
  root.add(tympGroup);
  reg.registerPart('tympanic_membrane', tympGroup, new THREE.Vector3(-0.2, 0.52, 0.4));

  // 3. Ossicles
  const ossGroup = new THREE.Group();
  ossGroup.position.set(0.08, 1.28, 0);
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e1, roughness: 0.45 });
  const malleus = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.18, 8, 12), boneMat);
  malleus.position.set(-0.08, 0.04, 0);
  malleus.rotation.z = -0.35;
  const incus = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), boneMat);
  incus.position.set(0.03, 0.08, 0);
  const stapes = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.015, 8, 16), boneMat);
  stapes.position.set(0.14, 0.02, 0);
  ossGroup.add(malleus, incus, stapes);
  root.add(ossGroup);
  reg.registerPart('ossicles', ossGroup, new THREE.Vector3(0, 0.65, 0));

  // 4. Semicircular Canals
  const semiGroup = new THREE.Group();
  semiGroup.position.set(0.45, 1.48, -0.05);
  const semiMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.32 });
  [
    [0, 0, 0],
    [Math.PI / 2, 0, 0.3],
    [0, Math.PI / 2, -0.3],
  ].forEach(([rx, ry, rz]) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 10, 26), semiMat);
    loop.rotation.set(rx, ry, rz);
    semiGroup.add(loop);
  });
  root.add(semiGroup);
  reg.registerPart('semicircular_canals', semiGroup, new THREE.Vector3(0.45, 0.62, 0));

  // 5. Spiral Cochlea
  const cochGroup = new THREE.Group();
  cochGroup.position.set(0.55, 1.12, 0.08);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 54; i++) {
    const t = i / 54;
    const angle = t * Math.PI * 5.0;
    const radius = 0.24 * (1 - t * 0.72);
    pts.push(new THREE.Vector3(Math.cos(angle) * radius, t * 0.22 - 0.08, Math.sin(angle) * radius));
  }
  const cochlea = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.048, 12, false),
    new THREE.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.38 })
  );
  const nerve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.36, 12),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 })
  );
  nerve.rotation.z = Math.PI / 2;
  nerve.position.set(0.3, 0.04, 0);
  cochGroup.add(cochlea, nerve);
  root.add(cochGroup);
  reg.registerPart('cochlea', cochGroup, new THREE.Vector3(0.75, -0.2, 0));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const vib = Math.sin(elapsed * 22) * 0.012;
      drum.position.x = vib;
      ossGroup.position.x = 0.08 + vib;
    },
  };
}

function buildHumanKidney(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.45);

  // 1. Renal Cortex Shell
  const cortexGroup = new THREE.Group();
  cortexGroup.position.set(0, 1.25, 0);
  const cortexMat = new THREE.MeshPhysicalMaterial({
    color: 0x991b1b,
    roughness: 0.42,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const topBulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), cortexMat);
  topBulb.scale.set(0.95, 1.05, 0.72);
  topBulb.position.set(-0.08, 0.28, 0);
  const botBulb = topBulb.clone();
  botBulb.position.set(-0.08, -0.28, 0);
  const midBack = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.56, 20), cortexMat);
  midBack.scale.set(0.9, 1, 0.7);
  midBack.position.set(-0.22, 0, 0);
  cortexGroup.add(topBulb, botBulb, midBack);
  root.add(cortexGroup);
  reg.shellMeshes.push(topBulb, botBulb, midBack);
  reg.registerPart('renal_cortex', cortexGroup, new THREE.Vector3(-0.7, 0.15, 0));

  // 2. Renal Medulla Pyramids
  const medGroup = new THREE.Group();
  medGroup.position.set(-0.06, 1.25, 0.02);
  const pyrMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
  for (let i = 0; i < 6; i++) {
    const a = -0.95 + i * 0.38;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 12), pyrMat);
    cone.position.set(Math.cos(a) * -0.22, Math.sin(a) * 0.42, 0);
    cone.rotation.z = a - Math.PI / 2;
    medGroup.add(cone);
  }
  root.add(medGroup);
  reg.registerPart('renal_medulla', medGroup, new THREE.Vector3(-0.25, 0.45, 0.45));

  // 3. Renal Pelvis
  const pelvGroup = new THREE.Group();
  pelvGroup.position.set(0.12, 1.25, 0.02);
  const pelvMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.42 });
  const basin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.32, 14), pelvMat);
  basin.rotation.z = Math.PI / 2;
  pelvGroup.add(basin);
  root.add(pelvGroup);
  reg.registerPart('renal_pelvis', pelvGroup, new THREE.Vector3(0.35, 0.15, 0.55));

  // 4. Renal Artery & Vein
  const vesGroup = new THREE.Group();
  vesGroup.position.set(0.35, 1.32, 0.04);
  const art = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.55, 14),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
  );
  art.rotation.z = Math.PI / 2;
  art.position.set(0.12, 0.08, 0.06);
  const vein = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.55, 14),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 })
  );
  vein.rotation.z = Math.PI / 2;
  vein.position.set(0.12, -0.06, -0.06);
  vesGroup.add(art, vein);
  root.add(vesGroup);
  reg.registerPart('renal_vessels', vesGroup, new THREE.Vector3(0.72, 0.32, 0));

  // 5. Ureter
  const uGroup = new THREE.Group();
  uGroup.position.set(0.24, 0.9, 0.02);
  const uCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.02, 0.3, 0),
    new THREE.Vector3(0.08, 0, 0.02),
    new THREE.Vector3(0.06, -0.45, 0.04),
  ]);
  uGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(uCurve, 18, 0.038, 10, false),
      new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 })
    )
  );
  root.add(uGroup);
  reg.registerPart('ureter_tube', uGroup, new THREE.Vector3(0.45, -0.55, 0));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const pulse = 1 + Math.sin(elapsed * 2.4) * 0.015;
      art.scale.set(pulse, 1, pulse);
    },
  };
}

function buildHumanTooth(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.35);

  // 1. Enamel Crown
  const enGroup = new THREE.Group();
  enGroup.position.set(0, 1.56, 0);
  const enMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.14,
    clearcoat: 0.9,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.56, 20), enMat);
  [[-0.16, 0.16], [0.16, 0.16], [-0.16, -0.16], [0.16, -0.16]].forEach(([x, z]) => {
    const cusp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), enMat);
    cusp.position.set(x, 0.25, z);
    enGroup.add(cusp);
  });
  enGroup.add(crown);
  root.add(enGroup);
  reg.shellMeshes.push(crown);
  reg.registerPart('tooth_enamel', enGroup, new THREE.Vector3(0, 0.65, 0));

  // 2. Dentin
  const denGroup = new THREE.Group();
  denGroup.position.set(0, 1.44, 0);
  const dentin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.28, 0.52, 18),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.48 })
  );
  denGroup.add(dentin);
  root.add(denGroup);
  reg.registerPart('tooth_dentin', denGroup, new THREE.Vector3(0.65, 0.2, 0));

  // 3. Pulp Chamber
  const pulpGroup = new THREE.Group();
  pulpGroup.position.set(0, 1.35, 0);
  const pMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, emissive: 0x7f1d1d, emissiveIntensity: 0.25 });
  const pBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 14), pMat);
  pBody.scale.set(1, 1.25, 0.85);
  [-0.14, 0.14].forEach((x) => {
    const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.015, 0.72, 10), pMat);
    canal.position.set(x, -0.45, 0);
    canal.rotation.z = x * -0.45;
    pulpGroup.add(canal);
  });
  pulpGroup.add(pBody);
  root.add(pulpGroup);
  reg.registerPart('pulp_chamber', pulpGroup, new THREE.Vector3(-0.68, 0.15, 0));

  // 4. Tooth Roots
  const rGroup = new THREE.Group();
  rGroup.position.set(0, 0.88, 0);
  const rMat = new THREE.MeshStandardMaterial({ color: 0xe7dec8, roughness: 0.55 });
  [-0.17, 0.17].forEach((x) => {
    const rootCone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 14), rMat);
    rootCone.rotation.x = Math.PI;
    rootCone.rotation.z = x * -0.5;
    rootCone.position.set(x, 0, 0);
    rGroup.add(rootCone);
  });
  root.add(rGroup);
  reg.registerPart('tooth_roots', rGroup, new THREE.Vector3(0, -0.5, 0));

  // 5. Gingiva & Bone
  const gGroup = new THREE.Group();
  gGroup.position.set(0, 0.96, 0);
  const gum = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.12, 12, 26),
    new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.45 })
  );
  gum.rotation.x = Math.PI / 2;
  gum.position.y = 0.26;
  const bone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.62, 0.45, 20),
    new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.75, transparent: true, opacity: 0.72 })
  );
  bone.position.y = -0.15;
  gGroup.add(gum, bone);
  root.add(gGroup);
  reg.registerPart('gingiva_bone', gGroup, new THREE.Vector3(0, -0.25, 0.65));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      pBody.scale.setScalar(1 + Math.sin(elapsed * 3.0) * 0.03);
    },
  };
}

function buildHumanSkin(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  // 1. Epidermis
  const epiGroup = new THREE.Group();
  epiGroup.position.set(0, 1.48, 0);
  const epi = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.14, 1.05),
    new THREE.MeshStandardMaterial({ color: 0xf1c29b, roughness: 0.55 })
  );
  epiGroup.add(epi);
  root.add(epiGroup);
  reg.registerPart('epidermis', epiGroup, new THREE.Vector3(0, 0.65, 0));

  // 2. Dermis
  const dermGroup = new THREE.Group();
  dermGroup.position.set(0, 1.08, 0);
  const derm = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.62, 1.05),
    new THREE.MeshPhysicalMaterial({ color: 0xe07a5f, roughness: 0.55, transparent: true, opacity: 0.72, depthWrite: false })
  );
  const cap = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.6, -0.2, 0.25),
        new THREE.Vector3(-0.1, 0.15, 0.28),
        new THREE.Vector3(0.45, -0.18, 0.22),
      ]),
      18,
      0.025,
      8,
      false
    ),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
  );
  dermGroup.add(derm, cap);
  root.add(dermGroup);
  reg.shellMeshes.push(derm);
  reg.registerPart('dermis_layer', dermGroup, new THREE.Vector3(-0.55, 0, 0));

  // 3. Subcutis Adipose
  const hypGroup = new THREE.Group();
  hypGroup.position.set(0, 0.58, 0);
  const fatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
  const baseBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.34, 1.05),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5, transparent: true, opacity: 0.78 })
  );
  hypGroup.add(baseBox);
  for (let x = -0.5; x <= 0.5; x += 0.25) {
    for (let z = -0.32; z <= 0.32; z += 0.32) {
      const cell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), fatMat);
      cell.position.set(x, 0, z);
      hypGroup.add(cell);
    }
  }
  root.add(hypGroup);
  reg.registerPart('hypodermis', hypGroup, new THREE.Vector3(0, -0.45, 0));

  // 4. Hair Follicle
  const hairGroup = new THREE.Group();
  hairGroup.position.set(-0.22, 1.32, 0.1);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.045, 1.15, 12),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.45 })
  );
  shaft.rotation.z = -0.18;
  shaft.position.y = 0.22;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
  );
  bulb.position.set(-0.1, -0.34, 0);
  const seb = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 })
  );
  seb.position.set(0.09, -0.02, 0.02);
  hairGroup.add(shaft, bulb, seb);
  root.add(hairGroup);
  reg.registerPart('hair_follicle', hairGroup, new THREE.Vector3(-0.3, 0.45, 0.55));

  // 5. Sweat Gland
  const swGroup = new THREE.Group();
  swGroup.position.set(0.36, 1.15, 0.08);
  const swCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.42, 0),
    new THREE.Vector3(0.02, 0.1, 0),
    new THREE.Vector3(-0.08, -0.25, 0.08),
    new THREE.Vector3(0.08, -0.32, -0.06),
    new THREE.Vector3(-0.04, -0.38, 0.04),
  ]);
  swGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(swCurve, 26, 0.028, 10, false),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
    )
  );
  root.add(swGroup);
  reg.registerPart('sweat_gland', swGroup, new THREE.Vector3(0.6, 0.25, 0.55));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      shaft.rotation.z = -0.18 + Math.sin(elapsed * 2.0) * 0.03;
    },
  };
}

function buildHumanNeuron(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.65);

  // 1. Dendrites
  const denGroup = new THREE.Group();
  denGroup.position.set(-0.78, 1.25, 0);
  const denMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.24, Math.sin(a) * 0.28, Math.cos(a) * 0.28),
      new THREE.Vector3(-0.48, Math.sin(a + 0.3) * 0.48, Math.cos(a + 0.3) * 0.48),
    ]);
    denGroup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 14, 0.022, 8, false), denMat));
  }
  root.add(denGroup);
  reg.registerPart('dendrites', denGroup, new THREE.Vector3(-0.65, 0.2, 0));

  // 2. Soma & Nucleus
  const somaGroup = new THREE.Group();
  somaGroup.position.set(-0.62, 1.25, 0);
  const soma = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 22, 18),
    new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.3, transparent: true, opacity: 0.48, depthWrite: false })
  );
  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.4 })
  );
  somaGroup.add(soma, nucleus);
  root.add(somaGroup);
  reg.shellMeshes.push(soma);
  reg.registerPart('soma_nucleus', somaGroup, new THREE.Vector3(-0.35, 0.5, 0));

  // 3. Axon Core
  const axonGroup = new THREE.Group();
  axonGroup.position.set(0.15, 1.25, 0);
  const axonMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.3,
    emissive: 0xd97706,
    emissiveIntensity: 0.3,
  });
  const axon = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 1.48, 14), axonMat);
  axon.rotation.z = Math.PI / 2;
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 1.2 })
  );
  axonGroup.add(axon, spark);
  root.add(axonGroup);
  reg.registerPart('axon_core', axonGroup, new THREE.Vector3(0, -0.35, 0.45));

  // 4. Myelin Sheaths
  const myeGroup = new THREE.Group();
  myeGroup.position.set(0.12, 1.25, 0);
  const myeMat = new THREE.MeshPhysicalMaterial({ color: 0xfef08a, roughness: 0.35, clearcoat: 0.5 });
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.2, 10, 16), myeMat);
    seg.rotation.z = Math.PI / 2;
    seg.position.x = -0.45 + i * 0.32;
    myeGroup.add(seg);
  }
  root.add(myeGroup);
  reg.registerPart('myelin_sheath', myeGroup, new THREE.Vector3(0, 0.55, 0));

  // 5. Axon Terminals
  const termGroup = new THREE.Group();
  termGroup.position.set(0.92, 1.25, 0);
  const termMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.35 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 0, 0),
      new THREE.Vector3(0.24, Math.sin(a) * 0.24, Math.cos(a) * 0.24),
    ]);
    termGroup.add(new THREE.Mesh(new THREE.TubeGeometry(tc, 10, 0.016, 8, false), termMat));
    const bouton = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), termMat);
    bouton.position.set(0.26, Math.sin(a) * 0.24, Math.cos(a) * 0.24);
    termGroup.add(bouton);
  }
  root.add(termGroup);
  reg.registerPart('axon_terminals', termGroup, new THREE.Vector3(0.68, 0.1, 0));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const p = ((elapsed * 0.9) % 1) * 1.4 - 0.7;
      spark.position.x = p;
    },
  };
}

function buildHumanArmMuscle(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.5);

  const boneMat = new THREE.MeshStandardMaterial({ color: 0xebe4d4, roughness: 0.5 });

  // 1. Bones
  const boneGroup = new THREE.Group();
  const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 1.15, 14), boneMat);
  humerus.position.set(0, 1.68, 0);
  const radius = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.95, 12), boneMat);
  radius.position.set(0.38, 1.05, 0.04);
  radius.rotation.z = -1.25;
  const ulna = radius.clone();
  ulna.position.set(0.38, 0.98, -0.04);
  boneGroup.add(humerus, radius, ulna);
  root.add(boneGroup);
  reg.registerPart('arm_bones', boneGroup, new THREE.Vector3(-0.6, 0, -0.3));

  // 2. Biceps
  const biGroup = new THREE.Group();
  biGroup.position.set(0.11, 1.72, 0.02);
  const biMat = new THREE.MeshPhysicalMaterial({ color: 0xdc2626, roughness: 0.4, clearcoat: 0.3 });
  const biceps = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), biMat);
  biceps.scale.set(0.85, 2.3, 0.85);
  biGroup.add(biceps);
  root.add(biGroup);
  reg.registerPart('biceps_muscle', biGroup, new THREE.Vector3(0.65, 0.25, 0.35));

  // 3. Triceps
  const triGroup = new THREE.Group();
  triGroup.position.set(-0.11, 1.72, -0.02);
  const triceps = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 }));
  triceps.scale.set(0.82, 2.25, 0.82);
  triGroup.add(triceps);
  root.add(triGroup);
  reg.registerPart('triceps_muscle', triGroup, new THREE.Vector3(-0.65, 0.1, -0.3));

  // 4. Tendons
  const tenGroup = new THREE.Group();
  const tenMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
  const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.05, 0.24, 12), tenMat);
  tTop.position.set(0.1, 2.18, 0.02);
  const tBot = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.028, 0.24, 12), tenMat);
  tBot.position.set(0.14, 1.24, 0.02);
  tBot.rotation.z = -0.3;
  tenGroup.add(tTop, tBot);
  root.add(tenGroup);
  reg.registerPart('tendons_ligaments', tenGroup, new THREE.Vector3(0.1, 0.45, 0.55));

  // 5. Brachial Artery & Nerve
  const nvGroup = new THREE.Group();
  const art = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.04, 2.25, 0.09),
        new THREE.Vector3(0.07, 1.25, 0.1),
        new THREE.Vector3(0.75, 0.92, 0.08),
      ]),
      20,
      0.018,
      8,
      false
    ),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35 })
  );
  nvGroup.add(art);
  root.add(nvGroup);
  reg.registerPart('brachial_neurovascular', nvGroup, new THREE.Vector3(0.35, -0.35, 0.68));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      const f = (Math.sin(elapsed * 1.8) + 1) * 0.5;
      biceps.scale.set(0.85 + f * 0.22, 2.3 - f * 0.18, 0.85 + f * 0.18);
    },
  };
}

function buildHumanSpine(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.4);

  const boneMat = new THREE.MeshStandardMaterial({ color: 0xebe4d4, roughness: 0.5 });
  const discMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.35 });

  // 1. Vertebral Bodies & Spinous Processes
  const vertGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const y = 0.52 + i * 0.24;
    const z = Math.sin(i * 0.45) * 0.06;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.15, 18), boneMat);
    body.position.set(0, y, z + 0.06);
    const spinous = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.24), boneMat);
    spinous.position.set(0, y - 0.02, z - 0.18);
    spinous.rotation.x = 0.35;
    vertGroup.add(body, spinous);
  }
  root.add(vertGroup);
  reg.registerPart('vertebral_bodies', vertGroup, new THREE.Vector3(-0.65, 0, 0));

  // 2. Intervertebral Discs
  const discGroup = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const y = 0.64 + i * 0.24;
    const z = Math.sin((i + 0.5) * 0.45) * 0.06;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.065, 18), discMat);
    disc.position.set(0, y, z + 0.06);
    discGroup.add(disc);
  }
  root.add(discGroup);
  reg.registerPart('intervertebral_discs', discGroup, new THREE.Vector3(0.65, 0, 0.25));

  // 3. Spinal Cord
  const cordGroup = new THREE.Group();
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.052, 1.85, 16),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 })
  );
  cord.position.set(0, 1.38, -0.08);
  cordGroup.add(cord);
  root.add(cordGroup);
  reg.registerPart('spinal_cord', cordGroup, new THREE.Vector3(0, 0.4, -0.6));

  // 4. Spinal Nerves
  const nerveGroup = new THREE.Group();
  const nMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });
  for (let i = 0; i < 7; i++) {
    const y = 0.64 + i * 0.24;
    [-1, 1].forEach((side) => {
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, y, -0.08),
        new THREE.Vector3(side * 0.28, y - 0.04, -0.02),
        new THREE.Vector3(side * 0.45, y - 0.12, 0.06),
      ]);
      nerveGroup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 10, 0.018, 8, false), nMat));
    });
  }
  root.add(nerveGroup);
  reg.registerPart('spinal_nerves', nerveGroup, new THREE.Vector3(0.55, 0, -0.45));

  // 5. Meninges & Ligaments
  const menGroup = new THREE.Group();
  const dura = new THREE.Mesh(
    new THREE.CylinderGeometry(0.088, 0.088, 1.82, 16),
    new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, roughness: 0.4, transparent: true, opacity: 0.42, depthWrite: false })
  );
  dura.position.set(0, 1.38, -0.08);
  menGroup.add(dura);
  root.add(menGroup);
  reg.shellMeshes.push(dura);
  reg.registerPart('meninges_ligaments', menGroup, new THREE.Vector3(0, 0.25, -0.82));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      root.rotation.y = Math.sin(elapsed * 0.7) * 0.08;
    },
  };
}

function buildHumanBloodCells(maxAniso: number): SpecimenBuildResult {
  const root = new THREE.Group();
  const reg = new PartRegistry();
  addPedestal(root, reg, maxAniso, 1.55);

  // 1. Erythrocytes (Lathe biconcave disc!)
  const rbcGroup = new THREE.Group();
  const rbcPts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, 0.022),
    new THREE.Vector2(0.08, 0.032),
    new THREE.Vector2(0.16, 0.058),
    new THREE.Vector2(0.2, 0.035),
    new THREE.Vector2(0.21, 0),
    new THREE.Vector2(0.2, -0.035),
    new THREE.Vector2(0.16, -0.058),
    new THREE.Vector2(0.08, -0.032),
    new THREE.Vector2(0.001, -0.022),
  ];
  const rbcGeo = new THREE.LatheGeometry(rbcPts, 24);
  const rbcMat = new THREE.MeshPhysicalMaterial({ color: 0xdc2626, roughness: 0.35, clearcoat: 0.45 });
  const rbcPositions: [number, number, number, number][] = [
    [-0.45, 1.25, 0.1, 0.3],
    [-0.1, 1.02, -0.15, -0.5],
    [0.36, 1.38, 0.08, 0.7],
    [0.52, 0.96, -0.08, 0.2],
  ];
  const rbcMeshes: THREE.Mesh[] = [];
  rbcPositions.forEach(([x, y, z, rx]) => {
    const m = new THREE.Mesh(rbcGeo, rbcMat);
    m.position.set(x, y, z);
    m.rotation.set(rx, rx * 0.7, 0);
    rbcGroup.add(m);
    rbcMeshes.push(m);
  });
  root.add(rbcGroup);
  reg.registerPart('erythrocytes', rbcGroup, new THREE.Vector3(-0.65, 0.2, 0.3));

  // 2. White Blood Cell (Neutrophil)
  const wbcGroup = new THREE.Group();
  wbcGroup.position.set(0.05, 1.32, 0.06);
  const wbcShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25, 2),
    new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.55, transparent: true, opacity: 0.65, depthWrite: false })
  );
  const wbcNucMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.4 });
  [-0.07, 0.0, 0.08].forEach((x, idx) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 10), wbcNucMat);
    lobe.position.set(x, idx === 1 ? 0.06 : -0.02, 0);
    wbcGroup.add(lobe);
  });
  wbcGroup.add(wbcShell);
  root.add(wbcGroup);
  reg.shellMeshes.push(wbcShell);
  reg.registerPart('leukocyte', wbcGroup, new THREE.Vector3(0, 0.65, 0));

  // 3. Platelets
  const platGroup = new THREE.Group();
  const pMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.35 });
  [[-0.25, 1.48, -0.1], [0.22, 1.12, 0.25], [-0.55, 0.92, -0.05]].forEach(([x, y, z]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), pMat);
    p.scale.set(1.3, 0.45, 1.1);
    p.position.set(x, y, z);
    platGroup.add(p);
  });
  root.add(platGroup);
  reg.registerPart('platelets', platGroup, new THREE.Vector3(0.65, 0.25, 0.3));

  // 4. Fibrin & Plasma
  const fibGroup = new THREE.Group();
  const fMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.7, 0.95 + i * 0.16, -0.15),
      new THREE.Vector3(0, 1.05 + (i % 2) * 0.2, 0.18),
      new THREE.Vector3(0.7, 0.9 + i * 0.18, -0.1),
    ]);
    fibGroup.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.01, 6, false), fMat));
  }
  root.add(fibGroup);
  reg.registerPart('fibrin_plasma', fibGroup, new THREE.Vector3(0, -0.45, 0.45));

  // 5. Cutaway Vessel Wall
  const vesGroup = new THREE.Group();
  vesGroup.position.set(0, 1.18, 0);
  const vessel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.76, 0.76, 1.85, 28, 1, true, Math.PI * 0.25, Math.PI * 1.45),
    new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.42, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide })
  );
  vessel.rotation.z = Math.PI / 2;
  vesGroup.add(vessel);
  root.add(vesGroup);
  reg.shellMeshes.push(vessel);
  reg.registerPart('vessel_wall', vesGroup, new THREE.Vector3(0, -0.25, -0.68));

  return {
    root,
    parts: reg.parts,
    clickableMeshes: reg.clickableMeshes,
    shellMeshes: reg.shellMeshes,
    textures: reg.textures,
    updateAnimation: (elapsed: number) => {
      rbcMeshes.forEach((m, i) => {
        m.rotation.y = elapsed * (0.6 + i * 0.15);
      });
      wbcGroup.position.y = 1.32 + Math.sin(elapsed * 1.4) * 0.04;
    },
  };
}

export function buildHumanSpecializedOrgan(
  id: string,
  maxAniso: number
): SpecimenBuildResult | null {
  switch (id) {
    case 'human_brain':
      return buildHumanBrain(maxAniso);
    case 'human_heart':
      return buildHumanHeart(maxAniso);
    case 'human_lungs':
      return buildHumanLungs(maxAniso);
    case 'human_skeleton':
      return buildHumanSkeleton(maxAniso);
    case 'human_digestive':
      return buildHumanDigestive(maxAniso);
    case 'human_eye':
      return buildHumanEye(maxAniso);
    case 'human_ear':
      return buildHumanEar(maxAniso);
    case 'human_kidney':
      return buildHumanKidney(maxAniso);
    case 'human_tooth':
      return buildHumanTooth(maxAniso);
    case 'human_skin':
      return buildHumanSkin(maxAniso);
    case 'human_neuron':
      return buildHumanNeuron(maxAniso);
    case 'human_arm_muscle':
      return buildHumanArmMuscle(maxAniso);
    case 'human_spine':
      return buildHumanSpine(maxAniso);
    case 'human_blood_cells':
      return buildHumanBloodCells(maxAniso);
    default:
      return null;
  }
}
