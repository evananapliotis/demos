/**
 * The 3D barber pole. Loaded lazily by Hero.astro as its own chunk.
 * Minimal three.js imports only (no examples/, no loaders, no controls).
 *
 *  - 30fps cap
 *  - pauses when the hero scrolls out of view or the tab is hidden
 *  - stops if the user switches on reduced motion
 *  - the static SVG stays underneath until the first frame has rendered
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  MeshStandardMaterial,
  CanvasTexture,
  RepeatWrapping,
  EquirectangularReflectionMapping,
  SRGBColorSpace,
  DirectionalLight,
  PointLight,
  MathUtils,
} from 'three';

const AMBER = '#f2a93b';
const CREAM = '#f4eee4';
const INK = '#14110e';
const FPS = 30;

/** Diagonal stripes, periodic in both axes so RepeatWrapping is seamless. */
function stripeTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const bands = [AMBER, CREAM, INK, CREAM].map((hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  const widths = [0.34, 0.16, 0.34, 0.16]; // amber, cream, ink, cream
  const edges: number[] = [];
  widths.reduce((acc, w) => { edges.push(acc + w); return acc + w; }, 0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = ((x + y) / size) % 1;
      let b = 0;
      while (b < edges.length - 1 && t >= edges[b]) b++;
      const i = (y * size + x) * 4;
      const [r, g, bl] = bands[b];
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = bl; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(2, 1.6);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A tiny equirect "studio": dark floor, warm horizon, amber glow. Gives the chrome something to reflect. */
function envTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#0a0908');
  g.addColorStop(0.42, '#3b2f21');
  g.addColorStop(0.5, '#f7e9cf');
  g.addColorStop(0.58, '#5a4630');
  g.addColorStop(1, '#0a0908');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 64);
  const glow = ctx.createRadialGradient(96, 22, 2, 96, 22, 26);
  glow.addColorStop(0, 'rgba(255,196,94,0.95)');
  glow.addColorStop(1, 'rgba(255,196,94,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 64);
  const tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

export function mount(slot: HTMLElement) {
  const canvas = document.createElement('canvas');
  slot.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.environment = envTexture();

  const camera = new PerspectiveCamera(26, 1, 0.1, 40);
  scene.add(camera);

  const chrome = new MeshStandardMaterial({ color: 0xe6e1d8, metalness: 1, roughness: 0.16, envMapIntensity: 1.5 });
  const stripes = stripeTexture();
  const body = new MeshStandardMaterial({ map: stripes, roughness: 0.32, metalness: 0.05, envMapIntensity: 0.55 });
  const sleeve = new MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, transparent: true, opacity: 0.14, envMapIntensity: 1.8, depthWrite: false });

  const pole = new Group();
  const add = (geo: CylinderGeometry | SphereGeometry | TorusGeometry, mat: MeshStandardMaterial, y: number, rx = 0) => {
    const m = new Mesh(geo, mat);
    m.position.y = y;
    m.rotation.x = rx;
    pole.add(m);
    return m;
  };
  add(new CylinderGeometry(0.6, 0.6, 3.2, 64, 1, true), body, 0);
  add(new CylinderGeometry(0.66, 0.66, 3.2, 64, 1, true), sleeve, 0);
  add(new CylinderGeometry(0.8, 0.8, 0.26, 64), chrome, 1.73);
  add(new CylinderGeometry(0.8, 0.8, 0.26, 64), chrome, -1.73);
  add(new TorusGeometry(0.7, 0.05, 12, 64), chrome, 1.58, Math.PI / 2);
  add(new TorusGeometry(0.7, 0.05, 12, 64), chrome, -1.58, Math.PI / 2);
  add(new CylinderGeometry(0.16, 0.2, 0.34, 32), chrome, 2.02);
  add(new SphereGeometry(0.42, 40, 24), chrome, 2.5);
  add(new CylinderGeometry(0.18, 0.22, 0.6, 32), chrome, -2.15);
  pole.rotation.z = -0.13;
  pole.rotation.x = 0.06;
  scene.add(pole);

  const key = new DirectionalLight(0xfff1dc, 2.6);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const amber = new PointLight(0xf2a93b, 26, 14, 2);
  amber.position.set(3, -1, 3.2);
  scene.add(amber);

  // Fit the pole (≈5.2 units tall, ≈1.7 wide) to the slot at any aspect ratio.
  const fit = () => {
    const w = slot.clientWidth || 1;
    const h = slot.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.tan(MathUtils.degToRad(camera.fov / 2));
    const zForH = 2.85 / half;
    const zForW = 1.05 / (half * camera.aspect);
    camera.position.set(0, 0.05, Math.max(zForH, zForW));
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(slot);

  // ---- loop: 30fps, paused when hidden or off-screen ----
  let raf = 0;
  let last = 0;
  let inView = true;
  let hidden = document.hidden;
  const frameMs = 1000 / FPS;
  let t0 = performance.now();
  let ready = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < frameMs) return;
    last = now - ((now - last) % frameMs);
    const t = (now - t0) / 1000;
    stripes.offset.y = -t * 0.22;
    pole.rotation.y = Math.sin(t * 0.45) * 0.09;
    pole.position.y = Math.sin(t * 0.7) * 0.03;
    amber.position.x = 3 + Math.sin(t * 0.38) * 1.4;
    amber.position.y = -1 + Math.cos(t * 0.29) * 1.6;
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      slot.classList.add('has-3d');
    }
  };
  const running = () => raf !== 0;
  const play = () => {
    if (running() || !inView || hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    if (!running()) return;
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const io = new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      inView ? play() : pause();
    },
    { threshold: 0 },
  );
  io.observe(slot);
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    hidden ? pause() : play();
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  reduced.addEventListener?.('change', () => {
    if (reduced.matches) pause();
    else play();
  });
  play();

  return {
    destroy() {
      pause();
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      canvas.remove();
      slot.classList.remove('has-3d');
    },
  };
}
