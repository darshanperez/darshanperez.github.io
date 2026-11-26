import * as THREE from 'three';
import { create as createServer, SIZE } from '../models/server.js';
import { colors, ease } from '../styles/tokens.js';

// Scenes 3–5 — Servers.
//   3 [0, 1.5)   three racks zoom in from nothing, low camera (contrapicado)
//   4 [1.5, 2.5) racks settle, cables draw between them, full sentence
//   5 [2.5, 4]   camera pushes into the central rack; side racks leave the frame

const S3 = 1.5;
const S4 = 1;
const S5 = 1.5;

const CENTER = 1.25;
const SIDE = 0.85;
const SIDE_X = 2.3;
const FLOOR = -1.1; // racks stand on this line (bottoms aligned)
const LAYOUT_WIDTH = 6.2; // world units the trio needs at scale 1

const LOW = { position: new THREE.Vector3(0, -1.7, 8.2), target: new THREE.Vector3(0, -0.35, 0) };

let world; // whole trio (scaled to fit the viewport)
const racks = []; // { holder, server, scale }
const cables = [];
const settle = { y: 0.3 };

function cable(from, to) {
  const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -0.35, 0.15));
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  const geometry = new THREE.TubeGeometry(curve, 48, 0.012, 6, false);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colors.accentOnDark, toneMapped: false }));
  geometry.setDrawRange(0, 0);
  mesh.userData.count = geometry.index.count;
  return mesh;
}

export default {
  id: 'servers',
  scrollLength: S3 + S4 + S5,

  init(ctx) {
    world = new THREE.Group();
    ctx.act('servers').add(world);
    world.visible = false;

    for (const [x, scale, turn] of [[-SIDE_X, SIDE, 0.25], [0, CENTER, 0], [SIDE_X, SIDE, -0.25]]) {
      const server = createServer();
      const holder = new THREE.Group(); // layout; `server.group` is animated
      holder.position.set(x, FLOOR + (SIZE.height * scale) / 2, x === 0 ? 0 : -0.5);
      holder.rotation.y = turn;
      server.group.scale.setScalar(0);
      holder.add(server.group);
      world.add(holder);
      racks.push({ holder, server, scale });
    }

    // Two cables per side, from the side racks into the central one.
    const sideFace = SIDE_X - (SIZE.width * SIDE) / 2;
    const centerFace = (SIZE.width * CENTER) / 2;
    for (const dir of [-1, 1]) {
      for (const y of [0.45, -0.35]) {
        const c = cable(new THREE.Vector3(dir * sideFace, y, 0.1), new THREE.Vector3(dir * centerFace, y + 0.1, 0.3));
        world.add(c);
        cables.push(c);
      }
    }

    ctx.onResize((w, h) => {
      const view = 2 * LOW.position.z * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2));
      world.scale.setScalar(Math.min(1, (view * (w / h)) / LAYOUT_WIDTH));
    });

    ctx.onTick((dt, t) => {
      if (!world.visible) return;
      for (const r of racks) r.server.update(t);
      world.position.y = settle.y;
    });
  },

  build(tl, ctx, { start }) {
    const s4 = start + S3;
    const s5 = s4 + S4;
    const cam = ctx.camera.position;
    const target = ctx.cameraTarget;

    tl.set(world, { visible: true }, start);

    // Scene 3 — low camera; racks zoom from nothing, center first.
    tl.to(cam, { x: LOW.position.x, y: LOW.position.y, z: LOW.position.z, duration: 1, ease: ease.move.gsap }, start)
      .to(target, { x: LOW.target.x, y: LOW.target.y, z: LOW.target.z, duration: 1, ease: ease.move.gsap }, start);
    [racks[1], racks[0], racks[2]].forEach((r, i) => {
      tl.to(r.server.group.scale, { x: r.scale, y: r.scale, z: r.scale, duration: 0.9, ease: ease.enter.gsap }, start + 0.1 + i * 0.15);
    });

    // Scene 4 — settle, then the cables draw in.
    tl.to(settle, { y: 0, duration: 1.2, ease: ease.move.gsap }, start + 0.5);
    cables.forEach((c, i) => {
      const draw = { p: 0 };
      tl.to(draw, {
        p: 1,
        duration: 0.6,
        ease: ease.move.gsap,
        onUpdate: () => c.geometry.setDrawRange(0, Math.round(draw.p * c.userData.count / 3) * 3),
      }, s4 + 0.1 + (i % 2) * 0.15);
    });
    const layer = ctx.layer('servers');
    ctx.cue(layer.querySelector('[data-cue="pre"]'), start + 0.8, s5);
    ctx.cue(layer.querySelector('[data-cue="main"]'), s4 + 0.1, s5);

    // Scene 5 — cables unplug, side racks leave the frame, camera pushes in
    // until the central rack's front fills the screen (its side edges stay as
    // two vertical lines running out of frame).
    cables.forEach((c) => {
      const draw = { p: 1 };
      tl.to(draw, { p: 0, duration: 0.4, ease: ease.exit.gsap, onUpdate: () => c.geometry.setDrawRange(0, Math.round(draw.p * c.userData.count / 3) * 3) }, s5);
    });
    racks.forEach((r, i) => {
      if (i === 1) return;
      const dir = i === 0 ? -1 : 1;
      tl.to(r.server.group.position, { x: dir * 3.5, z: 1, duration: 1, ease: ease.exit.gsap }, s5 + 0.1);
    });

    const center = () => {
      const k = world.scale.x;
      const height = SIZE.height * CENTER * k;
      const y = (FLOOR + (SIZE.height * CENTER) / 2) * k;
      const front = (SIZE.depth * CENTER * k) / 2 + 0.05;
      // Show ~62% of the rack's height so its top and bottom run out of frame.
      const distance = (height * 0.62) / (2 * Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov / 2)));
      return { y, front, distance };
    };
    tl.to(cam, { x: 0, y: () => center().y, z: () => center().front + center().distance, duration: S5, ease: ease.move.gsap }, s5)
      .to(target, { x: 0, y: () => center().y, z: () => center().front, duration: S5, ease: ease.move.gsap }, s5);
  },
};
