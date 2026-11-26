// Scene 1 — Cover: title, links, scroll hint. Text only.
// The cue starts above the page so scroll 0 is inside it, not on its edge.
export default {
  id: 'intro',
  scrollLength: 1,
  build(tl, ctx, { start, length }) {
    const layer = ctx.layer('intro');
    for (const el of layer.querySelectorAll('.cue')) ctx.cue(el, start - 1, start + length * 0.5);
  },
};
