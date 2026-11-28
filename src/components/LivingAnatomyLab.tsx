import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  FileDown,
  Focus,
  Layers,
  LayoutGrid,
  Microscope,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORY_META, ORGANISMS, OrganismCategory, OrganismId } from '../data/livingAnatomyData';
import {
  buildSpecimen,
  disposeSpecimen,
  SpecimenBuildResult,
} from '../three/anatomyBuilder';
import { useAuth } from '../hooks/useAuth';
import { useSaveLabResult } from './labs/useSaveLabResult';
import { cn } from '../lib/utils';

// Module-scope scratch math helpers (zero GC inside animation loop)
const _scratchVec = new THREE.Vector3();
const _scratchBox = new THREE.Box3();
const _scratchCenter = new THREE.Vector3();
const _scratchSize = new THREE.Vector3();
const _highlightColor = new THREE.Color(0x38bdf8);
const _hoverColor = new THREE.Color(0x1e3a8a);

type LayerPresetId = 'full' | 'muscular' | 'skeletal' | 'organs' | 'neurovascular' | 'custom';
type CameraViewPreset = 'front' | 'side' | 'back' | 'top';

const HUMAN_SUB_ORGAN_MAP: Record<string, { organismId: OrganismId; label: string }> = {
  brain: { organismId: 'human_brain', label: 'Brain Detail' },
  nervous_network: { organismId: 'human_spine', label: 'Spine Detail' },
  eyes_senses: { organismId: 'human_eye', label: 'Eye Detail' },
  heart: { organismId: 'human_heart', label: 'Heart Detail' },
  vascular: { organismId: 'human_blood_cells', label: 'Blood Cells' },
  lungs: { organismId: 'human_lungs', label: 'Lungs Detail' },
  stomach: { organismId: 'human_digestive', label: 'Digestive Detail' },
  intestines: { organismId: 'human_digestive', label: 'Digestive Detail' },
  kidneys: { organismId: 'human_kidney', label: 'Kidney Detail' },
  skeleton: { organismId: 'human_skeleton', label: 'Skeleton Detail' },
  muscles: { organismId: 'human_arm_muscle', label: 'Muscle Detail' },
  outer_body: { organismId: 'human_skin', label: 'Skin Detail' },
};

const HUMAN_LAYER_PRESETS: Array<{
  id: Exclude<LayerPresetId, 'custom'>;
  label: string;
  hiddenIds: string[];
}> = [
  { id: 'full', label: 'Full Body', hiddenIds: [] },
  { id: 'muscular', label: 'Muscular', hiddenIds: ['outer_body'] },
  {
    id: 'skeletal',
    label: 'Skeletal',
    hiddenIds: [
      'outer_body',
      'muscles',
      'brain',
      'nervous_network',
      'eyes_senses',
      'heart',
      'vascular',
      'lungs',
      'liver',
      'stomach',
      'intestines',
      'endocrine_lymph',
      'kidneys',
    ],
  },
  { id: 'organs', label: 'Organs', hiddenIds: ['outer_body', 'muscles', 'skeleton'] },
  {
    id: 'neurovascular',
    label: 'Vessels & Nerves',
    hiddenIds: [
      'outer_body',
      'muscles',
      'skeleton',
      'lungs',
      'liver',
      'stomach',
      'intestines',
      'endocrine_lymph',
      'kidneys',
    ],
  },
];

const HUMAN_SYSTEM_FILTERS = [
  { id: 'all', label: 'All Systems' },
  { id: 'Nervous', label: 'Nervous' },
  { id: 'Circulatory', label: 'Circulatory' },
  { id: 'Respiratory', label: 'Respiratory' },
  { id: 'Digestive', label: 'Digestive' },
  { id: 'Urinary', label: 'Urinary' },
  { id: 'Endocrine', label: 'Endocrine' },
  { id: 'Skeletal', label: 'Skeletal' },
  { id: 'Muscular', label: 'Muscular' },
  { id: 'Integumentary', label: 'Skin' },
];

export interface LivingAnatomyLabProps {
  embedded?: boolean;
  initialOrganism?: OrganismId;
  onExit?: () => void;
}

export default function LivingAnatomyLab({
  embedded = false,
  initialOrganism: initialOrganismProp,
  onExit,
}: LivingAnatomyLabProps = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const resolvedInitialOrganism = ((): OrganismId => {
    if (initialOrganismProp && ORGANISMS.some((o) => o.id === initialOrganismProp)) {
      return initialOrganismProp;
    }
    const q = searchParams.get('organism');
    if (q && ORGANISMS.some((o) => o.id === q)) return q;
    return 'human';
  })();

  const [organismId, setOrganismId] = useState<OrganismId>(resolvedInitialOrganism);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(
    ORGANISMS.find((o) => o.id === resolvedInitialOrganism)?.parts[1]?.id ??
      ORGANISMS.find((o) => o.id === resolvedInitialOrganism)?.parts[0]?.id ??
      'heart'
  );
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [explodeTarget, setExplodeTarget] = useState<number>(0);
  const [xrayShell, setXrayShell] = useState<boolean>(true);
  const [motionEnabled, setMotionEnabled] = useState<boolean>(true);
  const [motionSpeed, setMotionSpeed] = useState<0.4 | 1 | 1.8>(1);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [showFacts, setShowFacts] = useState<boolean>(false);
  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<OrganismCategory | 'all'>('all');
  const [humanSystemFilter, setHumanSystemFilter] = useState<string>('all');
  const [activeLayerPreset, setActiveLayerPreset] = useState<LayerPresetId>('full');
  const [hiddenPartIds, setHiddenPartIds] = useState<string[]>([]);
  const [isolatedPartId, setIsolatedPartId] = useState<string | null>(null);
  const [partSearch, setPartSearch] = useState<string>('');
  const [webglError, setWebglError] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement>(null);

  const {
    saveResult,
    downloadPdfReport,
    recordStep,
    recordedSteps,
    saving,
    feedback: labFeedback,
    canSave,
  } = useSaveLabResult('biology');

  // Refs synced to Three.js loop without triggering scene rebuilds
  const explodeTargetRef = useRef(explodeTarget);
  const xrayShellRef = useRef(xrayShell);
  const motionEnabledRef = useRef(motionEnabled);
  const motionSpeedRef = useRef(motionSpeed);
  const autoRotateRef = useRef(autoRotate);
  const selectedPartIdRef = useRef(selectedPartId);
  const hoveredPartIdRef = useRef(hoveredPartId);
  const hiddenPartIdsRef = useRef(hiddenPartIds);
  const isolatedPartIdRef = useRef(isolatedPartId);
  const humanSystemFilterRef = useRef(humanSystemFilter);

  explodeTargetRef.current = explodeTarget;
  xrayShellRef.current = xrayShell;
  motionEnabledRef.current = motionEnabled;
  motionSpeedRef.current = motionSpeed;
  autoRotateRef.current = autoRotate;
  selectedPartIdRef.current = selectedPartId;
  hoveredPartIdRef.current = hoveredPartId;
  hiddenPartIdsRef.current = hiddenPartIds;
  isolatedPartIdRef.current = isolatedPartId;
  humanSystemFilterRef.current = humanSystemFilter;

  const sceneApiRef = useRef<{
    loadOrganism: (id: OrganismId) => void;
    focusPart: (partId: string) => void;
    resetCamera: (id?: OrganismId) => void;
    setCameraView: (view: CameraViewPreset) => void;
    applyVisualState: () => void;
    captureSnapshot: () => string | null;
  } | null>(null);

  const activeOrganism = useMemo(
    () => ORGANISMS.find((o) => o.id === organismId) ?? ORGANISMS[0],
    [organismId]
  );

  const selectedPartIndex = useMemo(() => {
    if (!selectedPartId) return -1;
    return activeOrganism.parts.findIndex((p) => p.id === selectedPartId);
  }, [activeOrganism, selectedPartId]);

  const selectedPart =
    selectedPartIndex >= 0 ? activeOrganism.parts[selectedPartIndex] : null;

  const hoveredPart = useMemo(
    () =>
      hoveredPartId
        ? activeOrganism.parts.find((p) => p.id === hoveredPartId) ?? null
        : null,
    [activeOrganism, hoveredPartId]
  );

  const activeOrganismIndex = useMemo(
    () => Math.max(0, ORGANISMS.findIndex((o) => o.id === organismId)),
    [organismId]
  );

  const filteredOrganisms = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return ORGANISMS.filter((org) => {
      if (catalogCategory !== 'all' && org.categoryKey !== catalogCategory) return false;
      if (!q) return true;
      return (
        org.name.toLowerCase().includes(q) ||
        org.scientificName.toLowerCase().includes(q) ||
        org.category.toLowerCase().includes(q) ||
        org.parts.some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [catalogCategory, catalogSearch]);

  const filteredDockParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    return activeOrganism.parts.filter((p) => {
      if (
        organismId === 'human' &&
        humanSystemFilter !== 'all' &&
        !p.system.toLowerCase().includes(humanSystemFilter.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.system.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q)
      );
    });
  }, [activeOrganism.parts, humanSystemFilter, organismId, partSearch]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ORGANISMS.length };
    ORGANISMS.forEach((o) => {
      counts[o.categoryKey] = (counts[o.categoryKey] || 0) + 1;
    });
    return counts;
  }, []);

  // Keyboard shortcut: H to collapse/expand bottom dock, Escape closes catalog
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCatalogOpen(false);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Initialize Three.js WebGL stage once inside dedicated ref container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Detect software WebGL strictly for rendering cost parameters
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL rendering is unavailable in this browser.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D graphics context paused. Reload or reset to restore.');
    };
    const handleContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const bgHex = 0x0b1220;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);

    // 3-Point Warm/Cool Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xc8e2ff, 0x1e293b, 0.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.1);
    keyLight.position.set(4.5, 7.5, 5.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 22;
    const d = 4.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.05);
    rimLight.position.set(-5.0, 4.5, -5.0);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xfffaf0, 0.72);
    fillLight.position.set(-3.8, 2.2, 5.2);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 1.4;
    controls.maxDistance = 11.5;
    controls.maxPolarAngle = Math.PI * 0.54;

    let activeSpecimen: SpecimenBuildResult | null = null;
    let currentOrganismId: OrganismId = resolvedInitialOrganism;
    let currentExplode = explodeTargetRef.current;

    // Smooth camera focus transition targets
    let camTransitionActive = false;
    const camTargetPos = new THREE.Vector3();
    const orbitTargetGoal = new THREE.Vector3();

    controls.addEventListener('start', () => {
      camTransitionActive = false;
    });

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const getPartVisibilityMode = (partId: string): 'hidden' | 'ghosted' | 'visible' => {
      if (hiddenPartIdsRef.current.includes(partId)) return 'hidden';
      const isoId = isolatedPartIdRef.current;
      if (isoId) {
        return partId === isoId ? 'visible' : 'ghosted';
      }
      const sysFilter = humanSystemFilterRef.current;
      if (currentOrganismId === 'human' && sysFilter !== 'all') {
        const humanParts = ORGANISMS[0]?.parts ?? [];
        const pInfo = humanParts.find((p) => p.id === partId);
        const matches = pInfo?.system.toLowerCase().includes(sysFilter.toLowerCase()) ?? false;
        if (matches) return 'visible';
        if (partId === 'outer_body' || partId === 'muscles') return 'hidden';
        return 'ghosted';
      }
      return 'visible';
    };

    const applyVisualState = () => {
      if (!activeSpecimen) return;
      const selId = selectedPartIdRef.current;
      const hovId = hoveredPartIdRef.current;
      const showShell = xrayShellRef.current;
      const isoId = isolatedPartIdRef.current;
      const shellSet = new Set(activeSpecimen.shellMeshes);

      activeSpecimen.parts.forEach((entry, partId) => {
        const mode = getPartVisibilityMode(partId);
        if (mode === 'hidden') {
          entry.group.visible = false;
          return;
        }
        entry.group.visible = true;

        const isSelected = partId === selId && mode === 'visible';
        const isHovered = partId === hovId && !isSelected && mode === 'visible';

        entry.meshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (!mat) return;

          const baseOpacity = entry.baseOpacityMap.get(mesh) ?? 1;
          const baseTransparent = entry.baseTransparentMap.get(mesh) ?? false;
          const baseDepthWrite = entry.baseDepthWriteMap.get(mesh) ?? true;
          const prevTransparent = mat.transparent;

          if (mode === 'ghosted') {
            mat.transparent = true;
            mat.opacity = 0.065;
            mat.depthWrite = false;
            if (mat.emissive) {
              const baseEmissive = entry.baseEmissiveMap.get(mesh);
              if (baseEmissive) mat.emissive.copy(baseEmissive);
              mat.emissiveIntensity = 0;
            }
          } else {
            mat.transparent = baseTransparent;
            mat.opacity = baseOpacity;
            mat.depthWrite = baseDepthWrite;

            if (shellSet.has(mesh)) {
              const keepSolidSkin =
                isoId === partId ||
                (currentOrganismId === 'human' && humanSystemFilterRef.current === 'Integumentary');
              if (keepSolidSkin) {
                mat.opacity = 0.78;
                mat.depthWrite = true;
              } else if (currentOrganismId === 'human') {
                mat.opacity = showShell ? 0.2 : 0.72;
                mat.depthWrite = !showShell;
              } else if (currentOrganismId === 'fish') {
                mat.opacity = showShell ? 0.42 : 0.9;
                mat.depthWrite = !showShell;
              } else {
                mat.opacity = showShell ? 0.34 : 0.88;
                mat.depthWrite = !showShell;
              }
            }

            if (mat.emissive) {
              const baseEmissive = entry.baseEmissiveMap.get(mesh);
              if (isSelected) {
                mat.emissive.copy(_highlightColor);
                mat.emissiveIntensity = 0.36;
              } else if (isHovered) {
                mat.emissive.copy(_hoverColor);
                mat.emissiveIntensity = 0.25;
              } else if (baseEmissive) {
                mat.emissive.copy(baseEmissive);
                mat.emissiveIntensity = baseEmissive.getHex() === 0 ? 0 : 0.25;
              }
            }
          }

          if (mat.transparent !== prevTransparent) {
            mat.needsUpdate = true;
          }
        });
      });
    };

    const resetCamera = (id: OrganismId = currentOrganismId) => {
      const def = ORGANISMS.find((o) => o.id === id) ?? ORGANISMS[0];
      camTargetPos.set(...def.defaultCamera.position);
      orbitTargetGoal.set(...def.defaultCamera.target);
      camTransitionActive = true;
    };

    const setCameraView = (view: CameraViewPreset) => {
      const def = ORGANISMS.find((o) => o.id === currentOrganismId) ?? ORGANISMS[0];
      const [tx, ty, tz] = def.defaultCamera.target;
      const [px, py, pz] = def.defaultCamera.position;
      const dist = Math.max(2.6, Math.hypot(px - tx, py - ty, pz - tz));
      orbitTargetGoal.set(tx, ty, tz);
      if (view === 'front') {
        camTargetPos.set(tx, ty + dist * 0.08, tz + dist);
      } else if (view === 'side') {
        camTargetPos.set(tx + dist, ty + dist * 0.08, tz);
      } else if (view === 'back') {
        camTargetPos.set(tx, ty + dist * 0.08, tz - dist);
      } else {
        camTargetPos.set(tx, ty + dist * 0.92, tz + dist * 0.38);
      }
      camTransitionActive = true;
    };

    const loadOrganism = (id: OrganismId) => {
      if (activeSpecimen) {
        scene.remove(activeSpecimen.root);
        disposeSpecimen(activeSpecimen);
        activeSpecimen = null;
      }
      currentOrganismId = id;
      activeSpecimen = buildSpecimen(id, maxAniso);
      scene.add(activeSpecimen.root);

      const def = ORGANISMS.find((o) => o.id === id) ?? ORGANISMS[0];
      camera.position.set(...def.defaultCamera.position);
      controls.target.set(...def.defaultCamera.target);
      camTargetPos.copy(camera.position);
      orbitTargetGoal.copy(controls.target);
      camTransitionActive = false;
      currentExplode = explodeTargetRef.current;

      // Apply immediate explode offset on initial load if slider non-zero
      activeSpecimen.parts.forEach((entry) => {
        entry.group.position
          .copy(entry.basePos)
          .addScaledVector(entry.explodeOffset, currentExplode);
      });

      applyVisualState();
      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
    };

    const focusPart = (partId: string) => {
      if (!activeSpecimen) return;
      const entry = activeSpecimen.parts.get(partId);
      if (!entry) return;
      _scratchBox.setFromObject(entry.group);
      _scratchBox.getCenter(_scratchCenter);
      _scratchBox.getSize(_scratchSize);

      const maxDim = Math.max(_scratchSize.x, _scratchSize.y, _scratchSize.z, 0.35);
      const dist = Math.min(5.4, Math.max(1.65, maxDim * 3.1));

      _scratchVec.copy(camera.position).sub(controls.target);
      if (_scratchVec.lengthSq() < 0.001) _scratchVec.set(0.4, 0.3, 1);
      _scratchVec.normalize().multiplyScalar(dist);

      orbitTargetGoal.copy(_scratchCenter);
      camTargetPos.copy(_scratchCenter).add(_scratchVec);
      camTargetPos.y = Math.max(0.45, camTargetPos.y);
      camTransitionActive = true;
    };

    const captureSnapshot = (): string | null => {
      if (disposed) return null;
      try {
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    };

    sceneApiRef.current = {
      loadOrganism,
      focusPart,
      resetCamera,
      setCameraView,
      applyVisualState,
      captureSnapshot,
    };

    loadOrganism(resolvedInitialOrganism);

    // Raycasting with drag threshold so orbiting never accidentally picks a part
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const updatePointerNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickPartAt = (clientX: number, clientY: number): string | null => {
      if (!activeSpecimen) return null;
      updatePointerNdc(clientX, clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(activeSpecimen.clickableMeshes, false);
      for (const hit of hits) {
        const pid = hit.object.userData?.partId;
        if (typeof pid !== 'string') continue;
        if (getPartVisibilityMode(pid) !== 'visible') continue;
        return pid;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 36) return; // Dragged camera
      const hitPartId = pickPartAt(e.clientX, e.clientY);
      if (hitPartId) {
        setSelectedPartId(hitPartId);
        setShowFacts(false);
        focusPart(hitPartId);
        const def = ORGANISMS.find((o) => o.id === currentOrganismId);
        const partObj = def?.parts.find((p) => p.id === hitPartId);
        if (partObj) {
          recordStep(`Inspected 3D ${partObj.name} (${partObj.system}) in ${def?.name ?? 'specimen'}.`);
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;
      const hitPartId = pickPartAt(e.clientX, e.clientY);
      renderer.domElement.style.cursor = hitPartId ? 'pointer' : 'grab';
      if (hitPartId !== hoveredPartIdRef.current) {
        hoveredPartIdRef.current = hitPartId;
        setHoveredPartId(hitPartId);
        applyVisualState();
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => onResize())
        : null;
    resizeObserver?.observe(container);

    // Animation loop with exponential damping + Software-WebGL afterDraw pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let animElapsed = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);

      // Exponentially damped exploded-view separation
      const targetEx = explodeTargetRef.current;
      if (Math.abs(currentExplode - targetEx) > 0.0005 && activeSpecimen) {
        currentExplode = THREE.MathUtils.damp(currentExplode, targetEx, 7.5, delta);
        activeSpecimen.parts.forEach((entry) => {
          entry.group.position
            .copy(entry.basePos)
            .addScaledVector(entry.explodeOffset, currentExplode);
        });
      }

      // Smoothly damped camera focus transition
      if (camTransitionActive) {
        const alpha = 1 - Math.exp(-6.5 * delta);
        camera.position.lerp(camTargetPos, alpha);
        controls.target.lerp(orbitTargetGoal, alpha);
        if (
          camera.position.distanceToSquared(camTargetPos) < 0.0004 &&
          controls.target.distanceToSquared(orbitTargetGoal) < 0.0004
        ) {
          camera.position.copy(camTargetPos);
          controls.target.copy(orbitTargetGoal);
          camTransitionActive = false;
        }
      }

      // Subtle biological motion scaled by user playback speed
      if (activeSpecimen && motionEnabledRef.current) {
        animElapsed += delta * motionSpeedRef.current;
        activeSpecimen.updateAnimation(animElapsed, delta * motionSpeedRef.current);
      }

      controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
      controls.autoRotateSpeed = 1.25;
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      disposeSpecimen(activeSpecimen);
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  // Update visual highlight, X-ray shell, layer peel & isolation state without rebuilding WebGL scene
  useEffect(() => {
    sceneApiRef.current?.applyVisualState();
  }, [
    selectedPartId,
    hoveredPartId,
    xrayShell,
    hiddenPartIds,
    isolatedPartId,
    humanSystemFilter,
    organismId,
  ]);

  useEffect(() => {
    recordStep(`Loaded 3D Living Anatomy specimen: ${activeOrganism.name} (${activeOrganism.scientificName}).`);
  }, [activeOrganism.id, activeOrganism.name, activeOrganism.scientificName, recordStep]);

  const handleOrganismSelect = (nextId: OrganismId) => {
    if (nextId === organismId) return;
    setOrganismId(nextId);
    if (!embedded) {
      setSearchParams({ organism: nextId }, { replace: true });
    }
    const nextOrg = ORGANISMS.find((o) => o.id === nextId) ?? ORGANISMS[0];
    const defaultPart = nextOrg.parts[1]?.id ?? nextOrg.parts[0]?.id ?? null;
    setSelectedPartId(defaultPart);
    setHoveredPartId(null);
    setShowFacts(false);
    setHumanSystemFilter('all');
    setActiveLayerPreset('full');
    setHiddenPartIds([]);
    setIsolatedPartId(null);
    setPartSearch('');
    sceneApiRef.current?.loadOrganism(nextId);
  };

  useEffect(() => {
    if (initialOrganismProp && initialOrganismProp !== organismId) {
      handleOrganismSelect(initialOrganismProp);
    }
  }, [initialOrganismProp]);

  const handleSelectPart = (partId: string, focus = true) => {
    if (hiddenPartIds.includes(partId)) {
      setHiddenPartIds((prev) => prev.filter((id) => id !== partId));
      setActiveLayerPreset('custom');
    }
    if (isolatedPartId && isolatedPartId !== partId) {
      setIsolatedPartId(partId);
    }
    setSelectedPartId(partId);
    setShowFacts(false);
    const partObj = activeOrganism.parts.find((p) => p.id === partId);
    if (partObj) {
      recordStep(`Focused on ${partObj.name} (${partObj.system}) in ${activeOrganism.name}.`);
    }
    if (focus) {
      sceneApiRef.current?.focusPart(partId);
    }
  };

  const handleApplyLayerPreset = (presetId: Exclude<LayerPresetId, 'custom'>) => {
    const preset = HUMAN_LAYER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActiveLayerPreset(presetId);
    setHiddenPartIds(preset.hiddenIds);
    setIsolatedPartId(null);
    setHumanSystemFilter('all');
    if (presetId === 'full') {
      setXrayShell(true);
    }
    const firstVisible = activeOrganism.parts.find((p) => !preset.hiddenIds.includes(p.id));
    if (firstVisible && preset.hiddenIds.includes(selectedPartId ?? '')) {
      setSelectedPartId(firstVisible.id);
    }
    recordStep(`Peeled human anatomy to ${preset.label} layer view.`);
  };

  const handleHidePart = (partId: string) => {
    const partObj = activeOrganism.parts.find((p) => p.id === partId);
    setHiddenPartIds((prev) => (prev.includes(partId) ? prev : [...prev, partId]));
    setActiveLayerPreset('custom');
    if (isolatedPartId === partId) {
      setIsolatedPartId(null);
    }
    const remaining = activeOrganism.parts.filter(
      (p) => p.id !== partId && !hiddenPartIds.includes(p.id)
    );
    if (remaining.length > 0 && selectedPartId === partId) {
      setSelectedPartId(remaining[0].id);
    }
    if (partObj) {
      recordStep(`Hid ${partObj.name} layer to inspect deeper structures.`);
    }
  };

  const handleToggleIsolate = (partId: string) => {
    const partObj = activeOrganism.parts.find((p) => p.id === partId);
    setIsolatedPartId((prev) => {
      const next = prev === partId ? null : partId;
      if (partObj) {
        recordStep(
          next
            ? `Isolated ${partObj.name} in 3D dissection view.`
            : `Exited isolated view of ${partObj.name}.`
        );
      }
      return next;
    });
    if (hiddenPartIds.includes(partId)) {
      setHiddenPartIds((prev) => prev.filter((id) => id !== partId));
    }
    sceneApiRef.current?.focusPart(partId);
  };

  const handleRestoreAllLayers = () => {
    setHiddenPartIds([]);
    setIsolatedPartId(null);
    setHumanSystemFilter('all');
    setActiveLayerPreset('full');
    setPartSearch('');
    recordStep(`Restored all anatomical layers for ${activeOrganism.name}.`);
  };

  const handleStepPart = (dir: -1 | 1) => {
    const parts = filteredDockParts.length > 0 ? filteredDockParts : activeOrganism.parts;
    if (parts.length === 0) return;
    const idx = parts.findIndex((p) => p.id === selectedPartId);
    const baseIdx = idx >= 0 ? idx : 0;
    const nextIdx = (baseIdx + dir + parts.length) % parts.length;
    handleSelectPart(parts[nextIdx].id, true);
  };

  const buildReportPayload = () => {
    const partSummary = selectedPart
      ? `Focused on ${selectedPart.name} (${selectedPart.system}): ${selectedPart.functionality}`
      : `Completed full 3D anatomical exploration of ${activeOrganism.name}.`;
    const factsNote = selectedPart?.keyFacts.length
      ? `Key Anatomy Facts (${selectedPart.name}): ${selectedPart.keyFacts.join(' | ')}`
      : `${activeOrganism.name} features ${activeOrganism.parts.length} interactive anatomical structures.`;
    const defaultSteps = [
      `Loaded 3D Living Anatomy specimen: ${activeOrganism.name} (${activeOrganism.scientificName}).`,
      `Adjusted anatomical visualization (X-Ray Shell ${xrayShell ? 'On' : 'Off'}, Explode ${Math.round(explodeTarget * 100)}%, Layer ${activeLayerPreset}, Motion ${motionEnabled ? `${motionSpeed}x` : 'Paused'}).`,
      partSummary,
    ];

    return {
      experimentTitle: `3D Anatomy: ${activeOrganism.name}`,
      outcome: partSummary,
      measurements: `${activeOrganism.parts.length} anatomical structures · Hidden ${hiddenPartIds.length} · Explode ${Math.round(explodeTarget * 100)}% · X-Ray ${xrayShell ? 'On' : 'Off'}`,
      notes: factsNote,
      stepsTaken: recordedSteps.length > 0 ? recordedSteps : defaultSteps,
    };
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#0b1220] text-slate-100 select-none',
        embedded
          ? 'w-full h-[680px] sm:h-[760px] rounded-[2rem] border border-white/10 shadow-2xl'
          : 'w-screen h-screen'
      )}
    >
      {/* Dedicated WebGL Mount Container (never unmounted by UI state) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label={`Interactive 3D model of ${activeOrganism.name}`}
      />

      {/* Fallback UI if WebGL unavailable */}
      {webglError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b1220] p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <h2 className="text-lg font-semibold text-white">3D Viewport Unavailable</h2>
            <p className="text-sm text-slate-300">{webglError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-semibold hover:bg-sky-400 transition-colors"
            >
              Reload Studio
            </button>
          </div>
        </div>
      )}

      {/* Minimal Top-Left Header & Organism Switcher (solid rgba, zero backdrop-filter over WebGL) */}
      <header className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-3">
        <div
          className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl border border-white/12 shadow-xl"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          {(!embedded || onExit) && (
            <>
              <button
                type="button"
                onClick={() => (onExit ? onExit() : navigate(user ? '/dashboard' : '/'))}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft size={14} />
                <span>{embedded ? 'Workbench' : 'Back'}</span>
              </button>
              <span className="h-4 w-px bg-white/15 shrink-0" aria-hidden="true" />
            </>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white leading-tight whitespace-nowrap">
              3D Living Anatomy Lab
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight whitespace-nowrap">
              {activeOrganism.scientificName} · {activeOrganism.parts.length} parts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          {/* Anatomical Plane / Camera Orientation Presets */}
          <div
            className="pointer-events-auto hidden md:flex items-center gap-1 p-1 rounded-2xl border border-white/12 shadow-xl"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            {(['front', 'side', 'back', 'top'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => {
                  sceneApiRef.current?.setCameraView(view);
                  recordStep(`Switched camera angle to ${view} view.`);
                }}
                className="px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors capitalize whitespace-nowrap"
              >
                {view}
              </button>
            ))}
          </div>

          {organismId !== 'human' && organismId.startsWith('human_') && (
            <button
              type="button"
              onClick={() => handleOrganismSelect('human')}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-sky-400/35 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 shadow-xl transition-colors whitespace-nowrap"
              style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
            >
              <ArrowLeft size={13} />
              <span>Full Body</span>
            </button>
          )}

          <nav
            aria-label="Select living organism"
            className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl border border-white/12 shadow-xl max-w-full"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          >
            <button
              type="button"
              onClick={() => {
                const prevIdx = (activeOrganismIndex - 1 + ORGANISMS.length) % ORGANISMS.length;
                handleOrganismSelect(ORGANISMS[prevIdx].id);
              }}
              aria-label="Previous 3D model"
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              onClick={() => setCatalogOpen((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0',
                catalogOpen
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-white/8 text-white hover:bg-white/14'
              )}
            >
              <LayoutGrid size={14} />
              <span className="max-w-[165px] truncate">{activeOrganism.name}</span>
              <span
                className={cn(
                  'text-[10px] tabular-nums px-1.5 py-0.5 rounded-md',
                  catalogOpen ? 'bg-slate-950/20 text-slate-950' : 'bg-sky-500/20 text-sky-300'
                )}
              >
                {activeOrganismIndex + 1}/{ORGANISMS.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nextIdx = (activeOrganismIndex + 1) % ORGANISMS.length;
                handleOrganismSelect(ORGANISMS[nextIdx].id);
              }}
              aria-label="Next 3D model"
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <ChevronRight size={15} />
            </button>
          </nav>
        </div>
      </header>

      {/* Searchable 103-Organism Catalog Drawer (solid rgba, zero backdrop-filter over WebGL) */}
      {catalogOpen && (
        <div
          className="absolute inset-0 z-30 flex items-start justify-center p-4 pt-20"
          style={{ backgroundColor: 'rgba(2, 6, 23, 0.72)' }}
          onClick={() => setCatalogOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[78vh] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.98)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-white">
                  3D Anatomy Catalog ({ORGANISMS.length} Living Models)
                </h2>
                <p className="text-xs text-slate-400">
                  Human organs, mammals, birds, reptiles, marine life, insects, plants &amp; cells
                </p>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search species or organ..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setCatalogOpen(false)}
                  aria-label="Close catalog"
                  className="p-1.5 rounded-xl bg-white/8 text-slate-300 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto">
              {CATEGORY_META.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCatalogCategory(cat.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors',
                    catalogCategory === cat.id
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-white/6 text-slate-300 hover:text-white'
                  )}
                >
                  {cat.label} ({categoryCounts[cat.id] ?? 0})
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredOrganisms.map((org) => {
                const active = org.id === organismId;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      handleOrganismSelect(org.id);
                      setCatalogOpen(false);
                    }}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-colors flex flex-col gap-1',
                      active
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-slate-950/70 border-white/10 text-slate-200 hover:border-sky-400/50 hover:bg-slate-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {org.name}
                      </span>
                      <span className="text-[10px] font-medium text-sky-300 shrink-0 tabular-nums">
                        {org.parts.length} parts
                      </span>
                    </div>
                    <span className="text-[11px] italic text-slate-400 truncate">
                      {org.scientificName}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {org.category}
                    </span>
                  </button>
                );
              })}
              {filteredOrganisms.length === 0 && (
                <p className="col-span-full py-8 text-center text-xs text-slate-400">
                  No 3D models match &ldquo;{catalogSearch}&rdquo;.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtle Hover Prompt (non-blocking, top-center below header) */}
      {hoveredPart && hoveredPart.id !== selectedPartId && (
        <div
          className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl border border-white/15 text-xs text-slate-100 shadow-lg whitespace-nowrap"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          <span className="font-semibold">{hoveredPart.name}</span>
          <span className="text-slate-400"> · Click to inspect</span>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(940px,95vw)] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-t-xl rounded-b-lg border border-white/12 text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp size={13} />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown size={13} />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            className="pointer-events-auto w-full rounded-2xl border border-white/14 shadow-2xl p-3.5 sm:p-4 space-y-3"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          >
            {/* Selected Part Name & Biological Functionality */}
            {selectedPart ? (
              <div className="space-y-2 pb-2.5 border-b border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: selectedPart.accentHex }}
                        aria-hidden="true"
                      />
                      <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                        {selectedPart.name}
                      </h2>
                      {isolatedPartId === selectedPart.id && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-semibold whitespace-nowrap">
                          Isolated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {activeOrganism.name}
                      <span aria-hidden="true"> · </span>
                      {selectedPart.system}
                      <span aria-hidden="true"> · </span>
                      Part {selectedPartIndex + 1} of {activeOrganism.parts.length}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStepPart(-1)}
                      aria-label="Previous body part"
                      className="p-1.5 rounded-lg bg-white/8 text-slate-200 hover:bg-white/15 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepPart(1)}
                      aria-label="Next body part"
                      className="p-1.5 rounded-lg bg-white/8 text-slate-200 hover:bg-white/15 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => sceneApiRef.current?.focusPart(selectedPart.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <Focus size={13} />
                      <span>Focus</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleIsolate(selectedPart.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                        isolatedPartId === selectedPart.id
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'bg-white/8 text-slate-200 hover:bg-white/15'
                      )}
                    >
                      <Eye size={13} />
                      <span>{isolatedPartId === selectedPart.id ? 'Show Context' : 'Isolate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHidePart(selectedPart.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/8 text-slate-200 hover:bg-rose-500/20 hover:text-rose-200 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      <EyeOff size={13} />
                      <span>Hide</span>
                    </button>
                    {organismId === 'human' && HUMAN_SUB_ORGAN_MAP[selectedPart.id] && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = HUMAN_SUB_ORGAN_MAP[selectedPart.id];
                          recordStep(`Opened high-magnification ${target.label} from full human atlas.`);
                          handleOrganismSelect(target.organismId);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        <Microscope size={13} />
                        <span>{HUMAN_SUB_ORGAN_MAP[selectedPart.id].label}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowFacts((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/8 text-slate-200 hover:bg-white/15 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      {showFacts ? 'Hide Facts' : 'Key Facts'}
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                  <span className="font-semibold text-white">Function: </span>
                  {selectedPart.functionality}
                </p>

                {showFacts && (
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-slate-300">
                    {selectedPart.keyFacts.map((fact) => (
                      <li
                        key={fact}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 leading-snug"
                      >
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-300 pb-2 border-b border-white/10">
                Click any body part directly on the 3D model or choose a part name below to inspect its biological function.
              </p>
            )}

            {/* Human Body Atlas: Anatomical Layer Peel & System Filter */}
            {organismId === 'human' && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap">
                      Peel Layer
                    </span>
                    {HUMAN_LAYER_PRESETS.map((preset) => {
                      const active = activeLayerPreset === preset.id && isolatedPartId === null && humanSystemFilter === 'all';
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyLayerPreset(preset.id)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 border',
                            active
                              ? 'bg-sky-500 text-slate-950 border-sky-400'
                              : 'bg-white/6 text-slate-300 border-white/10 hover:text-white hover:bg-white/12'
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                    {(hiddenPartIds.length > 0 || isolatedPartId !== null || humanSystemFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={handleRestoreAllLayers}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 hover:bg-emerald-500/30 transition-colors whitespace-nowrap shrink-0"
                      >
                        Restore All
                      </button>
                    )}
                  </div>

                  <div className="relative w-full sm:w-48 shrink-0">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={partSearch}
                      onChange={(e) => setPartSearch(e.target.value)}
                      placeholder="Find organ, bone, nerve..."
                      className="w-full pl-7 pr-6 py-1 rounded-lg bg-slate-950/90 border border-white/12 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    {partSearch && (
                      <button
                        type="button"
                        onClick={() => setPartSearch('')}
                        aria-label="Clear structure filter"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {HUMAN_SYSTEM_FILTERS.map((sys) => {
                    const active = humanSystemFilter === sys.id;
                    return (
                      <button
                        key={sys.id}
                        type="button"
                        onClick={() => {
                          setHumanSystemFilter(sys.id);
                          setIsolatedPartId(null);
                          if (sys.id !== 'all') {
                            setHiddenPartIds([]);
                            setActiveLayerPreset('custom');
                            const match = activeOrganism.parts.find((p) =>
                              p.system.toLowerCase().includes(sys.id.toLowerCase())
                            );
                            if (match) {
                              handleSelectPart(match.id, true);
                            }
                          } else {
                            setActiveLayerPreset(hiddenPartIds.length === 0 ? 'full' : 'custom');
                          }
                          recordStep(`Filtered 3D human anatomy to ${sys.label}.`);
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 border',
                          active
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:text-white hover:bg-white/10'
                        )}
                      >
                        {sys.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Non-human Restore Banner when layers hidden/isolated */}
            {organismId !== 'human' && (hiddenPartIds.length > 0 || isolatedPartId !== null) && (
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>
                  {isolatedPartId
                    ? 'Single-structure isolation active'
                    : `${hiddenPartIds.length} structure${hiddenPartIds.length === 1 ? '' : 's'} hidden`}
                </span>
                <button
                  type="button"
                  onClick={handleRestoreAllLayers}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 hover:bg-emerald-500/30 transition-colors whitespace-nowrap"
                >
                  Restore All Parts
                </button>
              </div>
            )}

            {/* Body Parts Quick-Select Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {filteredDockParts.map((part) => {
                const isSelected = part.id === selectedPartId;
                const isHidden = hiddenPartIds.includes(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectPart(part.id, true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 border',
                      isSelected
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                        : isHidden
                          ? 'bg-slate-950/70 text-slate-500 border-white/5 line-through hover:text-slate-200'
                          : 'bg-white/6 text-slate-200 border-white/8 hover:bg-white/12'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-sm shrink-0"
                      style={{
                        backgroundColor: isSelected ? '#0f172a' : part.accentHex,
                      }}
                      aria-hidden="true"
                    />
                    <span>{part.name}</span>
                  </button>
                );
              })}
              {filteredDockParts.length === 0 && (
                <span className="text-xs text-slate-400 px-2 py-1">
                  No matching structures for &ldquo;{partSearch}&rdquo;.
                </span>
              )}
            </div>

            {/* Studio Interactive Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 min-w-[180px] flex-1 max-w-xs">
                <Layers size={14} className="text-slate-400 shrink-0" />
                <label
                  htmlFor="explode-slider"
                  className="text-xs font-medium text-slate-300 whitespace-nowrap"
                >
                  Explode
                </label>
                <input
                  id="explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explodeTarget}
                  onChange={(e) => setExplodeTarget(Number(e.target.value))}
                  onMouseUp={() =>
                    recordStep(`Set Exploded Dissection View to ${Math.round(explodeTarget * 100)}%.`)
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200 tabular-nums w-9 text-right">
                  {Math.round(explodeTarget * 100)}%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setXrayShell((prev) => {
                      const next = !prev;
                      recordStep(`Toggled X-Ray outer shell ${next ? 'On' : 'Off'}.`);
                      return next;
                    });
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0',
                    xrayShell
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/35'
                      : 'bg-white/6 text-slate-300 border-white/10 hover:text-white'
                  )}
                >
                  <Eye size={13} />
                  <span>X-Ray</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMotionEnabled((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0',
                    motionEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                      : 'bg-white/6 text-slate-300 border-white/10 hover:text-white'
                  )}
                >
                  {motionEnabled ? <Pause size={13} /> : <Play size={13} />}
                  <span>{motionEnabled ? 'Live' : 'Paused'}</span>
                </button>

                <div className="inline-flex items-center rounded-xl bg-white/6 border border-white/10 p-0.5 shrink-0">
                  {([0.4, 1, 1.8] as const).map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setMotionSpeed(rate);
                        if (!motionEnabled) setMotionEnabled(true);
                        recordStep(`Adjusted biological motion rate to ${rate}x.`);
                      }}
                      className={cn(
                        'px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap tabular-nums',
                        motionSpeed === rate
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      )}
                    >
                      {rate === 0.4 ? '0.4x' : rate === 1 ? '1x' : '1.8x'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setAutoRotate((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0',
                    autoRotate
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/35'
                      : 'bg-white/6 text-slate-300 border-white/10 hover:text-white'
                  )}
                >
                  <RefreshCw size={13} />
                  <span>Spin</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExplodeTarget(0);
                    sceneApiRef.current?.resetCamera(organismId);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white/8 text-slate-200 hover:bg-white/15 border border-white/10 transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>

                {canSave && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveResult(buildReportPayload())}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Save size={13} />
                    <span>{saving ? 'Saving...' : 'Save Lab'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const snapshotDataUrl = sceneApiRef.current?.captureSnapshot() || undefined;
                    downloadPdfReport({
                      ...buildReportPayload(),
                      snapshotDataUrl,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileDown size={13} />
                  <span>PDF Report</span>
                </button>
              </div>
            </div>

            {labFeedback && (
              <p
                className={cn(
                  'text-[11px] font-medium px-2.5 py-1.5 rounded-lg border',
                  labFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                )}
              >
                {labFeedback.text}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
