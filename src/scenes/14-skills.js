// Scene 14 — Skills & Tools (HTML only; the marquee arrives in phase 5).
export default {
  id: 'skills',
  scrollLength: 2,
  build(tl, ctx, { start, length }) {
    ctx.cue(ctx.layer('skills').querySelector('.cue'), start + 0.1, start + length * 0.85);
  },
};
