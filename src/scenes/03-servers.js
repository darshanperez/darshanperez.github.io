import { placeholderCube, enterExit } from './_placeholder.js';

// Scenes 3–5 — Servers. Placeholders for the procedural racks (phase 2).
let cubes = [];
export default {
  id: 'servers',
  scrollLength: 1.5 + 1 + 1.5,
  init(ctx) {
    cubes = [
      placeholderCube(ctx, { size: 0.9, x: -2.2 }),
      placeholderCube(ctx, { size: 1.4 }),
      placeholderCube(ctx, { size: 0.9, x: 2.2 }),
    ];
  },
  build(tl, ctx, slot) {
    cubes.forEach((c) => enterExit(tl, c, slot, { enter: 0.2, exit: 0.35 }));
    ctx.cue(ctx.layer('servers').querySelector('.cue'), slot.start + slot.length * 0.2, slot.start + slot.length * 0.6);
  },
};
