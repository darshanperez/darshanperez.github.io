import * as THREE from 'three';
import { create as createServer } from '../models/server.js';
import { ease } from '../styles/tokens.js';

// Scenes 3–5 — Servers.
//   ENTER [0, 1.5)    the three racks fly out of one point at the center and
//                     grow into place ("Experience with"); wide lens at floor
//                     height looking up, so undersides never show
//   HOLD  [1.5, 2.3)  a stop to read "server management"
//   PUSH  [2.3, 4]    one continuous move, no stops: side racks leave, the
//                     camera pushes into the central rack's glass and on into
//                     your face while everything fades to black

const ENTER = 1.5;
const HOLD = 0.8;
const PUSH = 1.7;

const CENTER = { width: 1.3, height: 2.9, depth: 1.1 };
const SIDE = { width: 1.1, height: 2.3, depth: 1.0 };
// Side racks stand behind the central one, each facing its own side.
const SIDE_X = 1.5;
const SIDE_Z = -0.7;
const SIDE_TURN = 0.45;

const FOV = 75;
const LOW = { position: new THREE.Vector3(0, 0.05, 3.0), target: new THREE.Vector3(0, 1.03, 0) };
const ORIGIN = new THREE.Vector3(0, 2.6, -6); // where the racks fly out from

let world;
let racks = []; // { holder, server, turn }
const fit = { k: 1 }; // camera distance multiplier for narrow screens

export default {
  id: 'servers',
  scrollLength: ENTER + HOLD + PUSH,

  init(ctx) {
    world = new THREE.Group();
    world.visible = false;
    ctx.act('servers').add(world);
    const segments = ctx.quality.segments;

    const specs = [
      { size: SIDE, x: -SIDE_X, z: SIDE_Z, turn: -SIDE_TURN }, // faces left
      { size: CENTER, x: 0, z: 0, turn: 0 },
      { size: SIDE, x: SIDE_X, z: SIDE_Z, turn: SIDE_TURN }, // faces right
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

    // Start every rack at the shared origin, tiny, tipped like a diamond.
    for (const r of racks) {
      r.server.group.position.copy(r.holder.worldToLocal(ORIGIN.clone()));
      r.server.group.scale.setScalar(0.04);
      r.server.group.rotation.z = r.turn ? Math.sign(r.turn) * 0.7 : 0;
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
    const hold = start + ENTER;
    const push = hold + HOLD;
    const cam = ctx.camera;
    const target = ctx.cameraTarget;

    tl.set(world, { visible: true }, start);

    // ENTER — wide, low camera; racks fly out from the center point.
    tl.to(cam, { fov: FOV, duration: 1, ease: ease.move.gsap }, start)
      .to(cam.position, { x: 0, y: LOW.position.y, z: () => LOW.position.z * fit.k, duration: 1, ease: ease.move.gsap }, start)
      .to(target, { x: LOW.target.x, y: LOW.target.y, z: LOW.target.z, duration: 1, ease: ease.move.gsap }, start);
    [racks[1], racks[0], racks[2]].forEach((r, i) => {
      const g = r.server.group;
      const at = start + 0.1 + i * 0.1;
      tl.to(g.position, { x: 0, y: 0, z: 0, duration: 1.1, ease: ease.enter.gsap }, at)
        .to(g.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: ease.enter.gsap }, at)
        .to(g.rotation, { z: 0, duration: 1.1, ease: ease.enter.gsap }, at);
    });

    // HOLD — nothing moves but the status lights.
    const layer = ctx.layer('servers');
    ctx.cue(layer.querySelector('[data-cue="pre"]'), start + 0.9, push);
    ctx.cue(layer.querySelector('[data-cue="main"]'), hold, push);

    // PUSH — a single accelerating move from the hold into the glass.
    const center = racks[1].server.size;
    const y = center.height / 2 + 0.25;
    tl.to(cam.position, { x: 0, y, z: center.front + 0.15, duration: PUSH, ease: ease.exit.gsap }, push)
      .to(target, { x: 0, y, z: center.front, duration: PUSH, ease: ease.exit.gsap }, push)
      .to(cam, { fov: 95, duration: PUSH, ease: ease.exit.gsap }, push)
      .to(ctx.fade, { opacity: 1, duration: PUSH * 0.45, ease: ease.move.gsap }, push + PUSH * 0.55);
    [racks[0], racks[2]].forEach((r, i) => {
      tl.to(r.holder.position, { x: (i ? 1 : -1) * 4.5, duration: PUSH * 0.8, ease: ease.exit.gsap }, push);
    });
  },
};
