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
  Focus,
  Layers,
  LayoutGrid,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
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
import { cn } from '../lib/utils';

// Module-scope scratch math helpers (zero GC inside animation loop)
const _scratchVec = new THREE.Vector3();
const _scratchBox = new THREE.Box3();
const _scratchCenter = new THREE.Vector3();
const _scratchSize = new THREE.Vector3();
const _highlightColor = new THREE.Color(0x38bdf8);
const _hoverColor = new THREE.Color(0x1e3a8a);

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
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [showFacts, setShowFacts] = useState<boolean>(false);
  const [catalogOpen, setCatalogOpen] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<OrganismCategory | 'all'>('all');
  const [webglError, setWebglError] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Refs synced to Three.js loop without triggering scene rebuilds
  const explodeTargetRef = useRef(explodeTarget);
  const xrayShellRef = useRef(xrayShell);
  const motionEnabledRef = useRef(motionEnabled);
  const autoRotateRef = useRef(autoRotate);
  const selectedPartIdRef = useRef(selectedPartId);
  const hoveredPartIdRef = useRef(hoveredPartId);

  explodeTargetRef.current = explodeTarget;
  xrayShellRef.current = xrayShell;
  motionEnabledRef.current = motionEnabled;
  autoRotateRef.current = autoRotate;
  selectedPartIdRef.current = selectedPartId;
  hoveredPartIdRef.current = hoveredPartId;

  const sceneApiRef = useRef<{
    loadOrganism: (id: OrganismId) => void;
    focusPart: (partId: string) => void;
    resetCamera: (id?: OrganismId) => void;
    applyVisualState: () => void;
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 1.4;
    controls.maxDistance = 11.5;
    controls.maxPolarAngle = Math.PI * 0.49;

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

    const applyVisualState = () => {
      if (!activeSpecimen) return;
      const selId = selectedPartIdRef.current;
      const hovId = hoveredPartIdRef.current;
      const showShell = xrayShellRef.current;

      activeSpecimen.parts.forEach((entry, partId) => {
        const isSelected = partId === selId;
        const isHovered = partId === hovId && !isSelected;

        entry.meshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (!mat || !mat.emissive) return;
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
        });
      });

      // Toggle X-ray translucency on outer shell meshes
      activeSpecimen.shellMeshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (!mat) return;
        if (currentOrganismId === 'human') {
          mat.opacity = showShell ? 0.2 : 0.72;
          mat.depthWrite = !showShell;
        } else if (currentOrganismId === 'fish') {
          mat.opacity = showShell ? 0.42 : 0.9;
          mat.depthWrite = !showShell;
        } else {
          mat.opacity = showShell ? 0.34 : 0.88;
          mat.depthWrite = !showShell;
        }
      });
    };

    const resetCamera = (id: OrganismId = currentOrganismId) => {
      const def = ORGANISMS.find((o) => o.id === id) ?? ORGANISMS[0];
      camTargetPos.set(...def.defaultCamera.position);
      orbitTargetGoal.set(...def.defaultCamera.target);
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

    sceneApiRef.current = {
      loadOrganism,
      focusPart,
      resetCamera,
      applyVisualState,
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
        if (typeof pid === 'string') return pid;
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

      // Subtle biological motion
      if (activeSpecimen && motionEnabledRef.current) {
        animElapsed += delta;
        activeSpecimen.updateAnimation(animElapsed, delta);
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

  // Update visual highlight & X-ray shell state without rebuilding WebGL scene
  useEffect(() => {
    sceneApiRef.current?.applyVisualState();
  }, [selectedPartId, hoveredPartId, xrayShell]);

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
    sceneApiRef.current?.loadOrganism(nextId);
  };

  useEffect(() => {
    if (initialOrganismProp && initialOrganismProp !== organismId) {
      handleOrganismSelect(initialOrganismProp);
    }
  }, [initialOrganismProp]);

  const handleSelectPart = (partId: string, focus = true) => {
    setSelectedPartId(partId);
    setShowFacts(false);
    if (focus) {
      sceneApiRef.current?.focusPart(partId);
    }
  };

  const handleStepPart = (dir: -1 | 1) => {
    const parts = activeOrganism.parts;
    if (parts.length === 0) return;
    const idx = selectedPartIndex >= 0 ? selectedPartIndex : 0;
    const nextIdx = (idx + dir + parts.length) % parts.length;
    handleSelectPart(parts[nextIdx].id, true);
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
              <div className="space-y-2 pb-3 border-b border-white/10">
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
                    </div>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {activeOrganism.name}
                      <span aria-hidden="true"> · </span>
                      {selectedPart.system}
                      <span aria-hidden="true"> · </span>
                      Part {selectedPartIndex + 1} of {activeOrganism.parts.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
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

            {/* Body Parts Quick-Select Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {activeOrganism.parts.map((part) => {
                const isSelected = part.id === selectedPartId;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectPart(part.id, true)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 border',
                      isSelected
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
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
            </div>

            {/* Studio Interactive Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 min-w-[200px] flex-1 max-w-xs">
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
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200 tabular-nums w-9 text-right">
                  {Math.round(explodeTarget * 100)}%
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setXrayShell((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0',
                    xrayShell
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/35'
                      : 'bg-white/6 text-slate-300 border-white/10 hover:text-white'
                  )}
                >
                  <Eye size={13} />
                  <span>X-Ray Shell</span>
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
                  <span>{motionEnabled ? 'Motion On' : 'Motion Off'}</span>
                </button>

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
                  <span>Reset View</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
