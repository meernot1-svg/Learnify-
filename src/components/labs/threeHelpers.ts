import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ThreeViewportContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  isSoftwareGl: boolean;
  afterDraw: (tick: () => void) => void;
  captureSnapshot: () => string | null;
  dispose: () => void;
}

/**
 * Initializes a hardened Three.js WebGL stage with PMREM RoomEnvironment,
 * Three-point studio lighting, OrbitControls, ResizeObserver, software-GL
 * frame pacing, and clean context loss / resource disposal.
 */
export function createThreeViewport(
  mount: HTMLElement,
  options?: {
    background?: number;
    fov?: number;
    cameraPos?: [number, number, number];
    minDistance?: number;
    maxDistance?: number;
    enableShadows?: boolean;
    onContextLost?: (lost: boolean) => void;
  }
): ThreeViewportContext | null {
  const width = Math.max(mount.clientWidth || 640, 300);
  const height = Math.max(mount.clientHeight || 420, 280);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
  } catch {
    return null;
  }

  const gl = renderer.getContext();
  let isSoftwareGl = false;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const vendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '');
      const card = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      const sig = `${vendor} ${card}`.toLowerCase();
      isSoftwareGl =
        sig.includes('swiftshader') ||
        sig.includes('llvmpipe') ||
        sig.includes('software rasterizer') ||
        sig.includes('mesa offscreen');
    }
  } catch {
    isSoftwareGl = false;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  if (options?.enableShadows && !isSoftwareGl) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  mount.innerHTML = '';
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(options?.background ?? 0x070b14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTarget = pmrem.fromScene(roomEnv, 0.04);
  scene.environment = envTarget.texture;
  roomEnv.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(options?.fov ?? 45, width / height, 0.1, 400);
  const [cx, cy, cz] = options?.cameraPos ?? [0, 3.2, 7.5];
  camera.position.set(cx, cy, cz);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = options?.minDistance ?? 2.2;
  controls.maxDistance = options?.maxDistance ?? 60;

  // Three-point studio lighting
  const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.75);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.0);
  keyLight.position.set(8, 12, 10);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
  rimLight.position.set(-10, 6, -8);
  scene.add(rimLight);

  let rafId = 0;
  let timerId = 0;
  let disposed = false;

  const afterDraw = (tick: () => void) => {
    if (disposed) return;
    if (isSoftwareGl) {
      timerId = window.setTimeout(() => {
        if (!disposed) rafId = window.requestAnimationFrame(tick);
      }, 90);
    } else {
      rafId = window.requestAnimationFrame(tick);
    }
  };

  const handleResize = () => {
    if (disposed) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (w < 10 || h < 10) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  const ro = new ResizeObserver(handleResize);
  ro.observe(mount);

  const onLost = (e: Event) => {
    e.preventDefault();
    options?.onContextLost?.(true);
  };
  const onRestored = () => {
    options?.onContextLost?.(false);
  };

  renderer.domElement.addEventListener('webglcontextlost', onLost);
  renderer.domElement.addEventListener('webglcontextrestored', onRestored);

  const dispose = () => {
    disposed = true;
    window.cancelAnimationFrame(rafId);
    window.clearTimeout(timerId);
    ro.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', onLost);
    renderer.domElement.removeEventListener('webglcontextrestored', onRestored);
    disposeObject3D(scene);
    envTarget.dispose();
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === mount) {
      mount.removeChild(renderer.domElement);
    }
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

  return { scene, camera, renderer, controls, isSoftwareGl, afterDraw, captureSnapshot, dispose };
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const record = m as unknown as Record<string, unknown>;
        for (const val of Object.values(record)) {
          if (val && typeof val === 'object' && 'isTexture' in val) {
            (val as THREE.Texture).dispose();
          }
        }
        m.dispose();
      }
    }
  });
}
