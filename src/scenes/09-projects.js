import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '../data/projects.js';
import { materials, screen } from '../core/materials.js';
import { applyTranslations, onLangChange } from '../core/i18n.js';
import { at } from '../core/text.js';
import { colors, ease } from '../styles/tokens.js';

// Scenes 9–13 — Projects.
//   TUNNEL  floating windows are born far away at the center (the vanishing
//           point) and travel toward the camera and out, alternating left and
//           right. Main projects come in front; secondary ones are smaller,
//           dimmer and further back, interleaved between them. Each window
//           carries its own label (real HTML, placed in 3D with CSS3D).
//   LIGHT   a white light is born at the center while the last windows leave
//           and grows until it fills the screen. Flat on purpose: bloom and
//           halo belong to the SFX phase (src/core/fx.js, materials.light).
//   WHITE   the page background is white.

const BASE = import.meta.env.BASE_URL;
const TUNNEL = 0.6 * projects.length;
const LIGHT = 1.5;
const WHITE = 0.5;

// One window's trip, in viewports of scroll. It approaches its reading spot
// (ease-enter) and, before it fully settles, starts leaving past the camera
// (ease-exit), so the tunnel never stops.
const APPROACH = 1.4;
const LEAVE_AT = 0.9; // the exit starts this far into the approach
const EXIT = 1.1;
const TRIP = LEAVE_AT + EXIT;
const SPACING = (TUNNEL - TRIP) / Math.max(1, projects.length - 1);

const RATIO = 16 / 10; // window aspect; media is cover-fitted into it
const RADIUS = 0.025; // corner radius, relative to the width (subtle)
const FAR_Z = -42; // the vanishing point
const READ_Z = { main: 0, secondary: -5 };
const OUT_Z = { main: 5.5, secondary: 4 };
const TILT = { read: 0.18, out: 0.7 }; // windows turn to face the center
const SECONDARY = { scale: 0.55, opacity: 0.4 };

let world;
let windows = []; // { project, main, side, group, material, label, video, state }
let light;
let css;
const posters = new Map(); // id → THREE.Texture
const layout = { main: {}, secondary: {}, farY: 0 };
const corner = new THREE.Vector3();
const scratch = {};

/**
 * Label height in window-width units (1 unit = the label box's px width).
 * CSS3D only attaches an element on its first render, so measure lazily.
 */
function labelHeight(w) {
  if (w.labelHeight == null && w.label.element.isConnected) {
    const box = parseFloat(w.label.element.style.width) || 1;
    w.labelHeight = w.label.element.firstElementChild.offsetHeight / box;
  }
  return w.labelHeight ?? 0;
}
const remeasureLabels = () => windows.forEach((w) => (w.labelHeight = null));

/** Rounded rectangle, width 1, centered, with UVs spanning 0..1. */
function windowGeometry() {
  const w = 1;
  const h = 1 / RATIO;
  const r = RADIUS;
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape()
    .moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y);
  const geometry = new THREE.ShapeGeometry(shape, 8);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return geometry;
}

/** Crop the texture like CSS `object-fit: cover`. */
function cover(texture, width, height) {
  const k = width / height / RATIO;
  if (k > 1) {
    texture.repeat.set(1 / k, 1);
    texture.offset.set((1 - 1 / k) / 2, 0);
  } else {
    texture.repeat.set(1, k);
    texture.offset.set(0, (1 - k) / 2);
  }
}

/** Mains in their order, secondaries in theirs, spread evenly between them. */
function sequence() {
  const main = projects.filter((p) => p.main);
  const secondary = projects.filter((p) => !p.main);
  return [
    ...main.map((p, i) => ({ p, k: (i + 0.25) / main.length })),
    ...secondary.map((p, i) => ({ p, k: (i + 0.75) / secondary.length })),
  ]
    .sort((a, b) => a.k - b.k)
    .map(({ p }) => p);
}

function labelElement(project) {
  const key = (k) => `project.${project.id}.${k}`;
  const el = document.createElement('div');
  el.className = `window-label${project.main ? '' : ' window-label--secondary'}`;
  el.innerHTML = `
    <div class="window-label__inner">
      <p class="window-label__role" data-i18n="${key('role')}"></p>
      <h3 class="window-label__title" data-i18n="${key('title')}"></h3>
      <p class="window-label__desc" data-i18n="${key('desc')}"></p>
    </div>`;
  applyTranslations(el);
  return el;
}

function createVideo(project, material) {
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'none', crossOrigin: 'anonymous' });
  video.setAttribute('aria-hidden', 'true');
  video.src = BASE + project.media;
  // Keep the poster until the first real frame, then switch to the video.
  video.addEventListener(
    'playing',
    () => {
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      cover(texture, video.videoWidth, video.videoHeight);
      material.map = texture;
      material.needsUpdate = true;
    },
    { once: true },
  );
  return video;
}

/** Screen rect (NDC) of a window, optionally with its label below it. */
function screenRect(w, camera, withLabel, out) {
  const top = 0.5 / RATIO;
  const bottom = withLabel ? -top - labelHeight(w) : -top;
  out.x0 = out.y0 = Infinity;
  out.x1 = out.y1 = -Infinity;
  for (const [x, y] of [[-0.5, top], [0.5, top], [-0.5, bottom], [0.5, bottom]]) {
    corner.set(x, y, 0).applyMatrix4(w.group.matrixWorld).project(camera);
    out.x0 = Math.min(out.x0, corner.x);
    out.x1 = Math.max(out.x1, corner.x);
    out.y0 = Math.min(out.y0, corner.y);
    out.y1 = Math.max(out.y1, corner.y);
  }
  return out;
}

/**
 * Labels are HTML over the canvas, so WebGL can't hide them behind a closer
 * window. Fade a label out while a closer window (or its label) covers it.
 */
function occlude(camera, dt) {
  const live = windows.filter((w) => w.group.visible);
  for (const w of live) {
    w.group.updateMatrixWorld();
    w.rect = screenRect(w, camera, w.state.t > 0.05, w.rect ?? {}); // window (+ label while shown)
    // label only: from the window's bottom edge down
    w.labelRect = screenRect(w, camera, true, w.labelRect ?? {});
    w.labelRect.y1 = screenRect(w, camera, false, scratch).y0;
  }
  const k = 1 - Math.pow(1 - 0.2, dt * 60); // frame-rate independent lerp
  for (const w of windows) {
    let covered = 0;
    if (w.group.visible) {
      const l = w.labelRect;
      const area = Math.max(1e-6, (l.x1 - l.x0) * (l.y1 - l.y0));
      for (const v of live) {
        if (v === w || v.group.position.z <= w.group.position.z) continue;
        const r = v.rect;
        const ix = Math.min(l.x1, r.x1) - Math.max(l.x0, r.x0);
        const iy = Math.min(l.y1, r.y1) - Math.max(l.y0, r.y0);
        if (ix > 0 && iy > 0 && (ix * iy) / area > 0.15) covered = 1;
      }
    }
    w.covered += (covered - w.covered) * k;
    const L = w.main ? layout.main : layout.secondary;
    w.label.element.style.opacity = w.state.t * L.opacity * (1 - w.covered);
  }
}

function place(w) {
  const L = w.main ? layout.main : layout.secondary;
  const { a, e, o } = w.state;
  const side = w.side;
  // far → reading spot (a), then reading spot → out past the camera (e)
  const rx = side * L.x;
  const ox = side * L.xOut;
  w.group.position.set(
    rx * a + (ox - rx) * e,
    layout.farY + (L.y - layout.farY) * a + (L.yOut - L.y) * e,
    FAR_Z + (L.z - FAR_Z) * a + (L.zOut - L.z) * e,
  );
  w.group.rotation.y = -side * (TILT.read * a + (TILT.out - TILT.read) * e);
  w.group.scale.setScalar(L.width);

  const opacity = o * L.opacity;
  const visible = opacity > 0.002;
  w.group.visible = visible;
  w.label.visible = visible;
  w.material.opacity = opacity;

  if (w.video) {
    if (visible && w.video.paused) w.video.play().catch(() => {});
    else if (!visible && !w.video.paused) w.video.pause();
  }
}

export default {
  id: 'projects',
  scrollLength: TUNNEL + LIGHT + WHITE,

  async load(ctx) {
    const loader = new THREE.TextureLoader();
    const max = ctx.renderer.capabilities.getMaxAnisotropy();
    await Promise.all(
      projects
        .filter((p) => p.poster)
        .map(async (p) => {
          const texture = await loader.loadAsync(BASE + p.poster);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = max;
          cover(texture, texture.image.width, texture.image.height);
          posters.set(p.id, texture);
        }),
    );
  },

  init(ctx) {
    world = ctx.act('projects');
    const geometry = windowGeometry();

    // Labels: real HTML, drawn in 3D with the WebGL camera.
    css = new CSS3DRenderer();
    css.domElement.className = 'windows';
    const layer = ctx.layer('projects');
    layer.prepend(css.domElement);
    ctx.onRender((scene, camera) => {
      if (windows.some((w) => w.group.visible)) css.render(scene, camera);
    });

    let lastMainSide = 1;
    windows = sequence().map((project) => {
      const material = screen(posters.get(project.id) ?? null);
      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);
      group.visible = false;

      const label = new CSS3DObject(labelElement(project));
      label.element.style.pointerEvents = 'none';
      label.position.y = -0.5 / RATIO; // its top edge sits on the window's bottom edge
      label.visible = false;
      group.add(label);
      world.add(group);

      // Mains alternate sides; each secondary takes the side the last main left free.
      let side;
      if (project.main) side = lastMainSide = -lastMainSide;
      else side = -lastMainSide;

      const video = project.media ? createVideo(project, material) : null;
      return { project, main: project.main, side, group, material, label, video, labelHeight: null, covered: 0, state: { a: 0, e: 0, o: 0, t: 0 } };
    });

    light = new THREE.Mesh(new THREE.CircleGeometry(3, 64 * ctx.quality.segments), materials.light);
    light.position.set(0, 0, FAR_Z);
    light.scale.setScalar(0);
    light.visible = false;
    world.add(light);

    ctx.onResize((w, h) => {
      css.setSize(w, h);
      const aspect = w / h;
      const wide = aspect > 1;
      const halfFov = Math.tan(THREE.MathUtils.degToRad(ctx.HOME.fov / 2));
      const view = (z) => {
        const height = 2 * (ctx.HOME.position.z - z) * halfFov;
        return { height, width: height * aspect };
      };

      const vm = view(READ_Z.main);
      const mw = Math.min(3.4, vm.width * 0.8);
      const mx = Math.max(0, vm.width / 2 - mw / 2 - 0.25) * 0.6;
      layout.main = {
        width: mw,
        opacity: 1,
        x: mx,
        y: wide ? 0.15 : 0.1,
        z: READ_Z.main,
        xOut: mx + mw * 1.6 + 1,
        yOut: 0,
        zOut: OUT_Z.main,
        px: h / vm.height, // CSS px per world unit at the reading spot
      };

      const vs = view(READ_Z.secondary);
      const sw = mw * SECONDARY.scale;
      const sx = Math.max(0, vs.width / 2 - sw / 2 - 0.4) * 0.75;
      layout.secondary = {
        width: sw,
        opacity: SECONDARY.opacity,
        x: sx,
        y: vs.height * (wide ? 0.12 : 0.18),
        z: READ_Z.secondary,
        xOut: sx + sw * 2 + 2,
        yOut: vs.height * 0.2,
        zOut: OUT_Z.secondary,
        px: h / vs.height,
      };
      layout.farY = 0.2;

      // Size each label box to its window's on-screen width at the reading
      // spot, so its text renders at the real type scale there.
      for (const win of windows) {
        const L = win.main ? layout.main : layout.secondary;
        const px = L.width * L.px;
        win.label.element.style.width = `${px}px`;
        win.label.scale.setScalar(1 / px);
      }
      remeasureLabels();
    });
    onLangChange(remeasureLabels);

    ctx.onTick((dt) => {
      windows.forEach(place);
      occlude(ctx.camera, dt);
    });
  },

  build(tl, ctx, { start }) {
    // TUNNEL — one trip per window, evenly spaced.
    windows.forEach((w, i) => {
      const s = start + i * SPACING;
      const st = w.state;
      tl.to(st, { a: 1, duration: APPROACH, ease: ease.enter.gsap }, s)
        .to(st, { o: 1, duration: APPROACH * 0.4, ease: ease.enter.gsap }, s)
        .to(st, { e: 1, duration: EXIT, ease: ease.exit.gsap }, s + LEAVE_AT)
        .to(st, { o: 0, duration: EXIT * 0.4, ease: ease.exit.gsap }, s + LEAVE_AT + EXIT * 0.6)
        // Its label arrives once the window has settled and leaves first, faster (§18.5).
        .to(st, { t: 1, duration: APPROACH * 0.35, ease: ease.enter.gsap }, s + APPROACH * 0.3)
        .to(st, { t: 0, duration: EXIT * 0.25, ease: ease.exit.gsap }, s + LEAVE_AT + EXIT * 0.1);
    });
    ctx.cue(ctx.layer('projects').querySelector('.cue'), start + 0.2, start + TUNNEL);

    // LIGHT — born at the vanishing point while the last windows leave, it
    // comes to the camera until it covers the screen; then the page turns white.
    const lightAt = start + TUNNEL - 0.5;
    const white = start + TUNNEL + LIGHT;
    const z = ctx.HOME.position.z - 1;
    tl.set(light, { visible: true }, lightAt)
      .to(light.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: ease.enter.gsap }, lightAt)
      .to(light.position, { z, duration: white - lightAt, ease: ease.move.gsap }, lightAt)
      .fromTo(
        document.documentElement,
        { '--bg': colors.ink },
        { '--bg': colors.snow, duration: 0.1, ease: ease.move.gsap, immediateRender: false },
        white - 0.1,
      )
      .set(light, { visible: false }, white);

    // From the white on, fixed UI (Skip) switches to its light-background style.
    ScrollTrigger.create({
      trigger: ctx.container,
      start: () => at(white),
      end: 'max',
      toggleClass: { targets: document.documentElement, className: 'is-light' },
    });
  },
};
