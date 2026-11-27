import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '../data/projects.js';
import { materials, screen } from '../core/materials.js';
import { applyTranslations, onLangChange } from '../core/i18n.js';
import { at } from '../core/text.js';
import { colors, ease } from '../styles/tokens.js';

// Scenes 9–13 — Projects, told in BEATS: one per main project.
//
//   1. The main window flies out of the vanishing point to its side
//      (left / right, alternating per beat) and settles.
//   2. Its 2–3 secondary windows arrive one after another on the other side,
//      each into its own slot (stacked at different heights).
//   3. HOLD: every window of the beat is fully on screen, still, readable.
//      Slots are solved in screen space from the free area (beside the main,
//      below the heading), so nothing overlaps at rest on any screen shape.
//   4. The secondaries leave past the camera while the next main grows into
//      the side they free; then this main leaves and the next secondaries
//      take its side.
//
// The section reads as walking down a corridor toward the light: windows
// hang on its walls, turned slightly toward the middle, and travel straight
// along them (vanishing point → slot → past the camera). Labels are real HTML
// placed in 3D with CSS3D and travel with their window until it leaves.
// Fillers line both walls at many heights, dim and far, never stopping.
//
// After the last beat: a flat white light grows until it fills the screen
// (bloom and halo belong to the SFX phase), then the page is white.

const BASE = import.meta.env.BASE_URL;

const RATIO = 16 / 10; // window aspect; media is cover-fitted into it
const RADIUS = 0.025; // corner radius, relative to the width (subtle)
const FAR_Z = -42; // the vanishing point
const DEPTH = { main: 0, secondary: -2.5, filler: -7 }; // z where each kind holds / passes
const OUT_Z = { main: 6, secondary: 4, filler: -7 }; // z at the end of the exit
const OPACITY = { main: 1, secondary: 0.55, filler: 0.3 };
const TILT = { hold: 0.28, out: 0.4 }; // like walls: turned slightly toward the middle

// Timing, in viewports of scroll.
// Exits accelerate (ease-exit), so each handoff waits until the windows that
// own a side are well on their way out before new ones land there.
const ARRIVE = 0.6; // vanishing point → slot
const SEC_DELAY = 0.45; // first secondary arrives this long after the main (old main is leaving its side)
const STAGGER = 0.25; // between the secondaries arriving
const HOLD = 0.45; // everything in the beat on screen, still
const LEAVE = 0.8; // slot → out past the camera
const SEC_STAGGER = 0.1; // between the secondaries leaving
const HANDOFF = 0.55; // the next main arrives this long after the secondaries start leaving
const MAIN_LEAVES = 0.35; // the main leaves this long after its secondaries
const FILLER_TRIP = 2.4;
const FILLER_END_Z = -3; // fillers slip off the screen's edge before the main windows' depth
const LIGHT = 1.5;
const WHITE = 0.5;

// Filler passes: each filler project goes down the corridor more than once,
// alternating walls, at these heights (fractions of the half-height).
const FILLER_PASSES = 16;
const FILLER_HEIGHTS = [0.75, -0.55, 0.15, -0.9, 0.45, -0.2, 0.95, -0.7];

/** Mains in order, each with its secondaries; loose secondaries go to the emptiest beat. */
function groupBeats() {
  const beats = projects.filter((p) => p.kind === 'main').map((main) => ({ main, secondaries: [] }));
  const byId = new Map(beats.map((b) => [b.main.id, b]));
  const loose = [];
  for (const p of projects.filter((p) => p.kind === 'secondary')) {
    const beat = byId.get(p.beat);
    if (beat) beat.secondaries.push(p);
    else loose.push(p);
  }
  for (const p of loose) {
    beats.reduce((min, b) => (b.secondaries.length < min.secondaries.length ? b : min)).secondaries.push(p);
  }
  return beats;
}
const BEATS = groupBeats();
const FILLERS = projects.filter((p) => p.kind === 'filler');

/** Start/leave times of each beat, relative to the scene start. */
function schedule() {
  let t = 0;
  const times = BEATS.map(({ secondaries }) => {
    const start = t;
    const lastArrival = secondaries.length ? SEC_DELAY + STAGGER * (secondaries.length - 1) : 0;
    const leave = start + lastArrival + ARRIVE + HOLD;
    t = leave + HANDOFF;
    return { start, leave };
  });
  return { times };
}
const { times: BEAT_TIMES } = schedule();
// The light is born as the last main starts leaving, with no gap before it.
const LIGHT_AT = BEAT_TIMES.at(-1).leave + MAIN_LEAVES;

let windows = []; // every window: { project, kind, group, material, label?, video, hold, out, state, … }
let beats = []; // { main: win, secondaries: [win], side }
let fillers = [];
let light;
let css;
let relayout = () => {};
const posters = new Map(); // id → THREE.Texture
const far = new THREE.Vector3(0, 0, FAR_Z); // end of the corridor, where the light is born
const corner = new THREE.Vector3();
const scratch = {};

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

function labelElement(project) {
  const key = (k) => `project.${project.id}.${k}`;
  const el = document.createElement('div');
  el.className = `window-label window-label--${project.kind}`;
  el.innerHTML = `
    <div class="window-label__inner">
      <p class="window-label__role" data-i18n="${key('role')}"></p>
      <h3 class="window-label__title" data-i18n="${key('title')}"></h3>
      <p class="window-label__desc" data-i18n="${key('desc')}"></p>
    </div>`;
  applyTranslations(el);
  el.style.pointerEvents = 'none';
  el.style.opacity = 0;
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

function createWindow(project, geometry, parent, cameraElement) {
  const material = screen(posters.get(project.id) ?? null);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, material));
  group.visible = false;
  parent.add(group);

  let label = null;
  if (project.kind !== 'filler') {
    label = new CSS3DObject(labelElement(project));
    label.position.y = -0.5 / RATIO; // the label's top edge sits on the window's bottom edge
    label.visible = false;
    group.add(label);
    cameraElement.append(label.element); // in the DOM from the start, so it can be measured
  }

  return {
    project,
    kind: project.kind,
    group,
    material,
    label,
    video: project.media ? createVideo(project, material) : null,
    from: new THREE.Vector3(), // far end of the corridor
    hold: new THREE.Vector3(),
    out: new THREE.Vector3(),
    width: 1, // world units
    tilt: 1, // which way it turns (toward the center)
    labelHeight: 0, // in window widths
    covered: 0,
    state: { a: 0, e: 0, o: 0, t: 0 }, // arrive, exit, opacity, label
  };
}

// ——— Layout: slots in screen space, solved back into the 3D scene ———

/**
 * Lays out every window for a W×H canvas. Each window gets a screen slot
 * (center + width in CSS px) at its kind's depth; that's turned into a 3D
 * position and size, so the window lands exactly on its slot.
 */
function layout(ctx, W, H) {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(ctx.HOME.fov / 2));
  const camZ = ctx.HOME.position.z;
  const halfH = (z) => (camZ - z) * tanHalf;
  const halfW = (z) => halfH(z) * (W / H);
  const pxPerUnit = (z) => H / (2 * halfH(z));
  const ndc = (px, py) => ({ x: (px / W) * 2 - 1, y: 1 - (py / H) * 2 });

  const heading = ctx.layer('projects').querySelector('.heading');
  const top = heading.offsetTop + heading.offsetHeight + 24; // free area below the heading
  const bottom = H - 32;
  const availH = bottom - top;
  const margin = Math.max(16, W * 0.06);
  const portrait = W / H < 1.05;
  css.domElement.classList.toggle('windows--compact', portrait);

  // Vanishing point: the center of the free area.
  far.set(0, ndc(0, (top + bottom) / 2).y * halfH(FAR_Z), FAR_Z);

  /** Sets the label box to `px` wide and returns its height in px. */
  function fit(w, px) {
    if (!w.label) return 0;
    const el = w.label.element;
    el.style.width = `${px}px`;
    w.label.scale.setScalar(1 / px);
    const display = el.style.display;
    el.style.display = ''; // CSS3D hides invisible objects with display: none
    const h = el.firstElementChild.offsetHeight;
    el.style.display = display;
    w.labelHeight = h / px;
    return h;
  }

  /** The exit point: past the edge of the screen along `dir`, near the camera. */
  function exitAlong(w, [dx, dy]) {
    const z = OUT_Z[w.kind];
    const len = Math.hypot(dx, dy) || 1;
    const hw = w.width / 2 / halfW(z);
    const hh = (w.width / RATIO / 2 + w.labelHeight * w.width) / halfH(z);
    const dist = 1.05 + Math.max(hw, hh) * 1.2;
    w.out.set((dx / len) * dist * halfW(z), (dy / len) * dist * halfH(z), z);
  }

  /** Puts `w` on the slot centered at (cx, cy) px, `px` wide; it leaves along `dir`. */
  function slot(w, cx, cy, px, dir) {
    const z = DEPTH[w.kind];
    const p = ndc(cx, cy);
    w.hold.set(p.x * halfW(z), p.y * halfH(z), z);
    w.from.set(w.hold.x, w.hold.y, FAR_Z); // straight down its wall line
    w.width = px / pxPerUnit(z);
    // Which wall it hangs on; a centered window (portrait main) turns less.
    w.tilt = Math.abs(p.x) < 0.15 ? Math.sign(dir[0]) * 0.4 : Math.sign(p.x);
    exitAlong(w, dir);
  }

  for (const beat of beats) {
    const { main, secondaries, side } = beat;
    const n = secondaries.length;

    if (!portrait) {
      // Main on its half; secondaries stacked on the other half, zig-zagging.
      const gap = W * 0.04;
      const regionW = W / 2 - margin - gap / 2;
      let mw = Math.min(regionW, 760);
      let mh = fit(main, mw);
      if (mw / RATIO + mh > availH) {
        mw = (availH - mh) * RATIO;
        mh = fit(main, mw);
      }
      const mcx = side < 0 ? margin + regionW / 2 : W - margin - regionW / 2;
      const mtop = top + (availH - (mw / RATIO + mh)) / 2;
      slot(main, mcx, mtop + mw / RATIO / 2, mw, [ndc(mcx, 0).x + side, 0]);

      const left = side < 0 ? W / 2 + gap / 2 : margin;
      const rowH = availH / Math.max(1, n);
      secondaries.forEach((s, i) => {
        let sw = Math.min(regionW * 0.62, 420);
        let sh = fit(s, sw);
        if (sw / RATIO + sh > rowH - 8) {
          sw = Math.max(120, (rowH - 8 - sh) * RATIO);
          sh = fit(s, sw);
        }
        const f = n === 1 ? 0.5 : [0.1, 0.9, 0.5][i % 3]; // 0 = nearest the center
        const cx = left + sw / 2 + (regionW - sw) * (side < 0 ? f : 1 - f);
        const cy = top + i * rowH + (rowH - (sw / RATIO + sh)) / 2 + sw / RATIO / 2;
        const p = ndc(cx, cy);
        slot(s, cx, cy, sw, [p.x - side * 0.3, p.y]);
      });
    } else {
      // Portrait: main at the bottom, secondaries in a row above it (title only).
      const cw = W - 2 * margin;
      let mw = cw;
      let mh = fit(main, mw);
      const maxBlock = availH * 0.6;
      if (mw / RATIO + mh > maxBlock) {
        mw = (maxBlock - mh) * RATIO;
        mh = fit(main, mw);
      }
      const mtop = bottom - (mw / RATIO + mh);
      const mcy = mtop + mw / RATIO / 2;
      slot(main, W / 2, mcy, mw, [side, ndc(0, mcy).y * 0.5]);

      const gap = 12;
      const rowH = mtop - 16 - top;
      let sw = (cw - gap * (n - 1)) / Math.max(1, n);
      let sh = Math.max(0, ...secondaries.map((s) => fit(s, sw)));
      if (sw / RATIO + sh > rowH) {
        sw = Math.max(80, (rowH - sh) * RATIO);
        sh = Math.max(0, ...secondaries.map((s) => fit(s, sw)));
      }
      const rowW = n * sw + (n - 1) * gap;
      secondaries.forEach((s, i) => {
        const cx = (W - rowW) / 2 + sw / 2 + i * (sw + gap);
        const cy = top + (rowH - (sw / RATIO + sh)) / 2 + sw / RATIO / 2;
        const p = ndc(cx, cy);
        slot(s, cx, cy, sw, [p.x || side, Math.max(0.4, p.y)]);
      });
    }
  }

  // Fillers never hold: they slide down the walls at many heights and slip
  // off the screen's edge before reaching the main windows' depth.
  const fw = Math.min(W, H * RATIO) * 0.18;
  const ref = DEPTH.filler;
  fillers.forEach((w, i) => {
    const side = i % 2 ? 1 : -1;
    const x = side * (halfW(ref) * 0.9 - 0.2 * (i % 3));
    const y = FILLER_HEIGHTS[i % FILLER_HEIGHTS.length] * halfH(ref) * 0.8;
    w.width = fw / pxPerUnit(ref);
    w.tilt = side;
    w.from.set(x, y, FAR_Z);
    w.out.set(x, y, FILLER_END_Z);
  });
}

// ——— Per frame ———

function place(w) {
  const { a, e, o } = w.state;
  const g = w.group;
  if (w.kind === 'filler') {
    g.position.lerpVectors(w.from, w.out, a);
    g.rotation.y = -w.tilt * TILT.hold;
  } else {
    // far end of its wall → slot (a), then slot → out past the camera (e)
    g.position.lerpVectors(w.from, w.hold, a);
    g.position.x += (w.out.x - w.hold.x) * e;
    g.position.y += (w.out.y - w.hold.y) * e;
    g.position.z += (w.out.z - w.hold.z) * e;
    g.rotation.y = -w.tilt * (TILT.hold + (TILT.out - TILT.hold) * e);
  }
  g.scale.setScalar(w.width);

  const opacity = o * OPACITY[w.kind];
  const visible = opacity > 0.002;
  g.visible = visible;
  w.material.opacity = opacity;
  if (w.label) w.label.visible = visible && w.state.t > 0.002;

  if (w.video) {
    if (visible && w.video.paused) w.video.play().catch(() => {});
    else if (!visible && !w.video.paused) w.video.pause();
  }
}

/** Screen rect (NDC) of a window, optionally with its label below it. */
function screenRect(w, camera, withLabel, out) {
  const top = 0.5 / RATIO;
  const bottom = withLabel ? -top - w.labelHeight : -top;
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
 * window. While windows cross (arriving / leaving), fade a label that a
 * closer window or its label covers. At rest, slots never overlap.
 */
function occlude(camera, dt) {
  const live = windows.filter((w) => w.label && w.group.visible);
  for (const w of live) {
    w.group.updateMatrixWorld();
    w.rect = screenRect(w, camera, w.state.t > 0.05, w.rect ?? {});
    w.labelRect = screenRect(w, camera, true, w.labelRect ?? {});
    w.labelRect.y1 = screenRect(w, camera, false, scratch).y0; // label only: under the window
  }
  const k = 1 - Math.pow(1 - 0.2, dt * 60); // frame-rate independent lerp
  for (const w of windows) {
    if (!w.label) continue;
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
    w.label.element.style.opacity = w.state.t * (1 - w.covered);
  }
}

export default {
  id: 'projects',
  scrollLength: LIGHT_AT + LIGHT + WHITE,

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
    const world = ctx.act('projects');
    const geometry = windowGeometry();

    // Labels: real HTML, drawn in 3D with the WebGL camera.
    css = new CSS3DRenderer();
    css.domElement.className = 'windows';
    ctx.layer('projects').prepend(css.domElement);
    const cameraElement = css.domElement.firstElementChild.firstElementChild;
    ctx.onRender((scene, camera) => {
      if (windows.some((w) => w.label?.visible)) css.render(scene, camera);
    });

    const passes = FILLERS.length ? Math.max(FILLER_PASSES, FILLERS.length) : 0;
    fillers = Array.from({ length: passes }, (_, i) => createWindow(FILLERS[i % FILLERS.length], geometry, world, cameraElement));
    beats = BEATS.map((b, i) => ({
      main: createWindow(b.main, geometry, world, cameraElement),
      secondaries: b.secondaries.map((p) => createWindow(p, geometry, world, cameraElement)),
      side: i % 2 ? 1 : -1, // the main's side: left first, then alternating
    }));
    windows = [...fillers, ...beats.flatMap((b) => [b.main, ...b.secondaries])];

    light = new THREE.Mesh(new THREE.CircleGeometry(3, 128 * ctx.quality.segments), materials.light);
    light.scale.setScalar(0);
    light.visible = false;
    world.add(light);

    let size = [1, 1];
    relayout = () => {
      layout(ctx, ...size);
      light.position.x = far.x;
      light.position.y = far.y;
    };
    light.position.z = FAR_Z;
    ctx.onResize((w, h) => {
      size = [w, h];
      css.setSize(w, h);
      relayout();
    });
    onLangChange(() => relayout());
    document.fonts.ready.then(() => relayout());

    ctx.onTick((dt) => {
      windows.forEach(place);
      occlude(ctx.camera, dt);
    });
  },

  build(tl, ctx, { start }) {
    const arrive = (w, s) =>
      tl
        .to(w.state, { a: 1, duration: ARRIVE, ease: ease.enter.gsap }, s)
        .to(w.state, { o: 1, duration: ARRIVE * 0.4, ease: ease.enter.gsap }, s)
        // The label comes in once its window has (almost) settled (§18.5).
        .to(w.state, { t: 1, duration: ARRIVE * 0.6, ease: ease.enter.gsap }, s + ARRIVE * 0.5);
    const leave = (w, s) =>
      tl
        .to(w.state, { e: 1, duration: LEAVE, ease: ease.exit.gsap }, s)
        // The label travels with its window and fades with it at the very end.
        .to(w.state, { o: 0, t: 0, duration: LEAVE * 0.35, ease: ease.exit.gsap }, s + LEAVE * 0.65);

    beats.forEach((beat, i) => {
      const { start: b, leave: l } = BEAT_TIMES[i];
      arrive(beat.main, start + b);
      beat.secondaries.forEach((s, j) => arrive(s, start + b + SEC_DELAY + STAGGER * j));
      beat.secondaries.forEach((s, j) => leave(s, start + l + SEC_STAGGER * j));
      leave(beat.main, start + l + MAIN_LEAVES);
    });

    // Fillers: spread over the corridor, always moving toward the camera.
    const spacing = (LIGHT_AT + 0.6 - FILLER_TRIP) / Math.max(1, fillers.length - 1);
    fillers.forEach((w, i) => {
      const s = start + i * spacing;
      tl.to(w.state, { a: 1, duration: FILLER_TRIP, ease: ease.exit.gsap }, s)
        .to(w.state, { o: 1, duration: FILLER_TRIP * 0.25, ease: ease.enter.gsap }, s)
        .to(w.state, { o: 0, duration: FILLER_TRIP * 0.12, ease: ease.exit.gsap }, s + FILLER_TRIP * 0.88);
    });

    ctx.cue(ctx.layer('projects').querySelector('.cue'), start + 0.2, start + LIGHT_AT + 0.4);

    // LIGHT — born at the vanishing point while the last windows leave, it
    // comes to the camera until it covers the screen; then the page turns white.
    const lightAt = start + LIGHT_AT;
    const white = lightAt + LIGHT;
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
