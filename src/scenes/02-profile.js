import { placeholderCube, enterExit } from './_placeholder.js';

// Scene 2 — Profile. Placeholder for the rotating photo plane (phase 2).
let cube;
export default {
  id: 'profile',
  scrollLength: 1.5,
  init(ctx) {
    cube = placeholderCube(ctx, { size: 1.6, x: -1.4 });
  },
  build(tl, ctx, slot) {
    enterExit(tl, cube, slot);
    ctx.cue(ctx.layer('profile').querySelector('.cue'), slot.start + slot.length * 0.3, slot.start + slot.length * 0.75);
  },
};
