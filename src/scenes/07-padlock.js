import { placeholderCube, enterExit } from './_placeholder.js';

// Scenes 7–8 — Padlock. Placeholder for the procedural padlock (phase 3).
let cube;
export default {
  id: 'padlock',
  scrollLength: 1.5 + 1.5,
  init(ctx) {
    cube = placeholderCube(ctx, { size: 1.3, y: 0.4 });
  },
  build(tl, ctx, slot) {
    enterExit(tl, cube, slot);
    ctx.cue(ctx.layer('padlock').querySelector('.cue'), slot.start + slot.length * 0.25, slot.start + slot.length * 0.75);
  },
};
