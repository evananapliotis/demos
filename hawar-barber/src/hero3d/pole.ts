/**
 * The 3D barber pole. Loaded lazily by Hero.astro as its own chunk (three.js core only).
 *
 *  - scroll-driven: spins, tilts and speeds its stripes up with scroll progress and velocity
 *    (Hero.astro writes data-p / data-v on the slot; this module only reads them)
 *  - touch: horizontal drag spins it with inertia, vertical scrolling passes straight through
 *  - pointer (desktop) and device tilt (Android) nudge the pole and drift the amber light
 *  - 30fps cap, pauses off-screen or when the tab is hidden, stops on reduced motion
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
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  RepeatWrapping,
  EquirectangularReflectionMapping,
  SRGBColorSpace,
  AdditiveBlending,
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
  const edges = [0.34, 0.5, 0.84, 1];
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

/** Soft radial sprite texture (used for the amber glow and the contact shadow). */
function radialTexture(inner: string, outer: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
  scene.add(pole);

  // Amber glow behind the pole (additive, so it reads as light, not paint).
  const glow = new Mesh(
    new PlaneGeometry(2.3, 6.0),
    new MeshBasicMaterial({ map: radialTexture('rgba(242,169,59,0.55)', 'rgba(242,169,59,0)'), transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  glow.position.set(0.1, -0.2, -1.4);
  scene.add(glow);

  // Contact shadow under the base.
  const shadow = new Mesh(
    new PlaneGeometry(2.6, 1.1),
    new MeshBasicMaterial({ map: radialTexture('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.15, -2.62, 0);
  scene.add(shadow);

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
    const zForH = 2.9 / half;
    const zForW = 1.1 / (half * camera.aspect);
    camera.position.set(0, 0.05, Math.max(zForH, zForW));
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(slot);

  // ---- interaction state ----
  let dragAngle = 0; // accumulated spin from touch / mouse drags
  let dragVel = 0; // rad per frame, decays (inertia)
  let dragging = false;
  let lastX = 0;
  let pointerX = 0; // -1..1 across the viewport (desktop hover)
  let pointerY = 0;
  let tiltG = 0; // device orientation gamma (-1..1)
  let tiltB = 0;
  const rot = { y: 0, z: -0.13, x: 0.06 };

  slot.style.touchAction = 'pan-y';
  slot.style.cursor = 'grab';
  slot.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    dragVel = 0;
    slot.style.cursor = 'grabbing';
    slot.setPointerCapture?.(e.pointerId);
  });
  slot.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    dragAngle += dx * 0.012;
    dragVel = dx * 0.012;
  });
  const endDrag = () => {
    dragging = false;
    slot.style.cursor = 'grab';
  };
  slot.addEventListener('pointerup', endDrag);
  slot.addEventListener('pointercancel', endDrag);
  slot.addEventListener('lostpointercapture', endDrag);

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointerX = (e.clientX / innerWidth) * 2 - 1;
      pointerY = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  // Device tilt where no permission prompt is needed (Android). iOS keeps the pole scroll-driven only.
  const DOE = (window as Window & { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      tiltG = MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1);
      tiltB = MathUtils.clamp(((e.beta ?? 45) - 45) / 45, -1, 1);
    }, { passive: true });
  }

  // ---- loop: 30fps, paused when hidden or off-screen ----
  let raf = 0;
  let last = 0;
  let inView = true;
  let hidden = document.hidden;
  const frameMs = 1000 / FPS;
  let t0 = performance.now();
  let ready = false;
  let velSmooth = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < frameMs) return;
    const dt = Math.min(0.1, (now - last) / 1000) || frameMs / 1000;
    last = now - ((now - last) % frameMs);
    const t = (now - t0) / 1000;

    // Scroll state from Hero.astro: progress through the hero (0..1) and velocity (px/ms).
    const p = Math.min(1, Math.max(0, Number(slot.dataset.p) || 0));
    const v = Number(slot.dataset.v) || 0;
    velSmooth = lerp(velSmooth, Math.min(2.4, Math.abs(v) * 1.6), 0.15);

    // Inertia from drags.
    if (!dragging) {
      dragAngle += dragVel;
      dragVel *= 0.94;
    }

    const targetY = dragAngle + p * Math.PI * 1.35 + pointerX * 0.28 + Math.sin(t * 0.45) * 0.09;
    const targetZ = -0.13 + p * 0.55 + tiltG * 0.14 - pointerX * 0.06;
    const targetX = 0.06 + pointerY * 0.16 + tiltB * 0.12 + p * 0.1;
    rot.y = lerp(rot.y, targetY, 0.14);
    rot.z = lerp(rot.z, targetZ, 0.1);
    rot.x = lerp(rot.x, targetX, 0.1);
    pole.rotation.set(rot.x, rot.y, rot.z);
    pole.position.y = Math.sin(t * 0.7) * 0.03 - p * 0.35;
    shadow.position.y = -2.62 - p * 0.35;
    shadow.material.opacity = 1 - p * 0.6;

    // Stripes: idle crawl, faster with scroll velocity and drag.
    const speed = 0.22 + velSmooth + Math.min(1.5, Math.abs(dragVel) * 6);
    stripes.offset.y -= speed * dt;

    // Light drifts with time, scroll and the pointer; glow breathes and flares with motion.
    amber.position.x = 3 + Math.sin(t * 0.38) * 1.4 + pointerX * 1.2;
    amber.position.y = -1 + Math.cos(t * 0.29) * 1.6 - p * 2 - pointerY * 1.2;
    amber.intensity = 26 + velSmooth * 14;
    (glow.material as MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 0.8) * 0.12 + Math.min(0.35, velSmooth * 0.25);
    glow.position.x = 0.1 + pointerX * 0.25;

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
