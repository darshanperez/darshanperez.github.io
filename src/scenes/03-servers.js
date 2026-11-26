import * as THREE from 'three';
import { create as createServer } from '../models/server.js';
import { colors, ease } from '../styles/tokens.js';

// Scenes 3–5 — Servers.
//   3 [0, 1.5)   the three racks fly out of one point at the center and grow
//                into place; wide-angle camera at floor height looking up, so
//                they tower and taper and their undersides never show
//   4 [1.5, 2.5) cables draw in, LEDs blink, camera creeps closer, full
//                sentence; a black gradient comes down from the top
//   5 [2.5, 4]   push-in: first to the rack's front filling the screen, then
//                on into your face while everything fades to black

const S3 = 1.5;
const S4 = 1;
const S5 = 1.5;

const CENTER = { width: 1.3, height: 2.9, depth: 1.1 };
const SIDE = { width: 1.1, height: 2.3, depth: 1.0 };
const SIDE_X = 1.45;
const SIDE_Z = 0.35;
const SIDE_TURN = 0.38; // side racks face inward

// Wide lens at floor height, tilted up ~19°: tops narrower than bottoms, no undersides.
const FOV = 75;
const LOW = { position: new THREE.Vector3(0, 0.05, 3.0), target: new THREE.Vector3(0, 1.03, 0) };
const ORIGIN = new THREE.Vector3(0, 2.6, -6); // where the racks fly out from

let world;
let racks = []; // { holder, server, turn }
const cables = [];
const fit = { k: 1 }; // camera distance multiplier for narrow screens

function cable(from, to) {
  const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.28, 0.22));
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, mid, to]), 40, 0.011, 6, false);
  geometry.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colors.accentOnDark, toneMapped: false }));
  mesh.userData.count = geometry.index.count;
  return mesh;
}

const setDraw = (c, p) => c.geometry.setDrawRange(0, Math.round((p * c.userData.count) / 3) * 3);

export default {
  id: 'servers',
  scrollLength: S3 + S4 + S5,

  init(ctx) {
    world = new THREE.Group();
    world.visible = false;
    ctx.act('servers').add(world);
    const segments = ctx.quality.segments;

    const specs = [
      { size: SIDE, x: -SIDE_X, z: SIDE_Z, turn: SIDE_TURN },
      { size: CENTER, x: 0, z: 0, turn: 0 },
      { size: SIDE, x: SIDE_X, z: SIDE_Z, turn: -SIDE_TURN },
    ];
    racks = specs.map(({ size, x, z, turn }) => {
      const server = createServer(size, { segments });
      const holder = new THREE.Group(); // final place; `server.group` animates inside it
      holder.position.set(x, size.height / 2, z); // all stand on y = 0
      holder.rotation.y = turn;
      holder.add(server.group);
      world.add(holder);
      return { holder, server, turn };
    });
    world.updateMatrixWorld(true);

    // Two cables per side, drooping in front of the gaps.
    const [left, center, right] = racks;
    for (const [side, dir] of [[left, 1], [right, -1]]) {
      for (const y of [0.55, -0.25]) {
        const a = side.holder.localToWorld(new THREE.Vector3(dir * (SIDE.width / 2 - 0.12), y, SIDE.depth / 2 + 0.06));
        const b = center.holder.localToWorld(new THREE.Vector3(-dir * (CENTER.width / 2 - 0.12), y + 0.2, CENTER.depth / 2 + 0.06));
        const c = cable(a, b);
        world.add(c);
        cables.push(c);
      }
    }

    // Start every rack at the shared origin, tiny, tipped like a diamond.
    for (const r of racks) {
      r.server.group.position.copy(r.holder.worldToLocal(ORIGIN.clone()));
      r.server.group.scale.setScalar(0.04);
      r.server.group.rotation.z = r.turn ? Math.sign(r.turn) * -0.7 : 0;
    }

    ctx.onResize((w, h) => {
      // Keep most of the trio in frame on tall screens by backing the camera off.
      const halfFov = THREE.MathUtils.degToRad(FOV / 2);
      fit.k = Math.max(1, (0.8 * 2.3) / (Math.tan(halfFov) * (w / h)) / LOW.position.z);
    });

    ctx.onTick((dt, t) => {
      if (world.visible) racks.forEach((r) => r.server.update(t));
    });
  },

  build(tl, ctx, { start }) {
    const s4 = start + S3;
    const s5 = s4 + S4;
    const cam = ctx.camera;
    const target = ctx.cameraTarget;
    const lowZ = () => LOW.position.z * fit.k;

    tl.set(world, { visible: true }, start);

    // Scene 3 — wide, low camera; racks fly out from the center point.
    tl.to(cam, { fov: FOV, duration: 1, ease: ease.move.gsap }, start)
      .to(cam.position, { x: 0, y: LOW.position.y, z: lowZ, duration: 1, ease: ease.move.gsap }, start)
      .to(target, { x: LOW.target.x, y: LOW.target.y, z: LOW.target.z, duration: 1, ease: ease.move.gsap }, start);
    [racks[1], racks[0], racks[2]].forEach((r, i) => {
      const g = r.server.group;
      const at = start + 0.1 + i * 0.1;
      tl.to(g.position, { x: 0, y: 0, z: 0, duration: 1.1, ease: ease.enter.gsap }, at)
        .to(g.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: ease.enter.gsap }, at)
        .to(g.rotation, { z: 0, duration: 1.1, ease: ease.enter.gsap }, at);
    });

    // Scene 4 — cables draw in; the camera creeps closer so the racks grow.
    cables.forEach((c, i) => {
      const draw = { p: 0 };
      tl.to(draw, { p: 1, duration: 0.6, ease: ease.move.gsap, onUpdate: () => setDraw(c, draw.p) }, s4 + (i % 2) * 0.15);
    });
    tl.to(cam.position, { z: () => lowZ() * 0.88, duration: S4, ease: ease.move.gsap }, s4)
      .to(ctx.shade, { opacity: 1, duration: 1, ease: ease.move.gsap }, s4 + 0.5);

    const layer = ctx.layer('servers');
    ctx.cue(layer.querySelector('[data-cue="pre"]'), start + 0.9, s5);
    ctx.cue(layer.querySelector('[data-cue="main"]'), s4 + 0.1, s5);

    // Scene 5 — unplug, side racks leave, push in.
    cables.forEach((c) => {
      const draw = { p: 1 };
      tl.to(draw, { p: 0, duration: 0.35, ease: ease.exit.gsap, onUpdate: () => setDraw(c, draw.p) }, s5);
    });
    [racks[0], racks[2]].forEach((r, i) => {
      tl.to(r.server.group.position, { x: (i ? 1 : -1) * 3, z: 1.5, duration: 0.9, ease: ease.exit.gsap }, s5 + 0.1);
    });

    const cy = CENTER.height / 2;
    const front = CENTER.depth / 2 + 0.05;
    // A: the front fills the screen; its side edges stay as two vertical lines.
    const framed = () => (CENTER.height * 0.62) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
    tl.to(cam.position, { x: 0, y: cy, z: () => front + framed(), duration: 0.8, ease: ease.move.gsap }, s5)
      .to(target, { x: 0, y: cy, z: front, duration: 0.8, ease: ease.move.gsap }, s5);
    // B: keep going, into your face, widening the lens, while it all goes black.
    tl.to(cam.position, { y: cy + 0.25, z: front + 0.12, duration: 0.7, ease: ease.exit.gsap }, s5 + 0.8)
      .to(target, { y: cy + 0.25, duration: 0.7, ease: ease.exit.gsap }, s5 + 0.8)
      .to(cam, { fov: 95, duration: 0.7, ease: ease.exit.gsap }, s5 + 0.8)
      .to(ctx.fade, { opacity: 1, duration: 0.75, ease: ease.move.gsap }, s5 + 0.75);
  },
};
