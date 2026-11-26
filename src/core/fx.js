// Render pipeline: the only place a frame is drawn. Today it's a straight
// render. The SFX phase (§15, phase 7) adds post-processing here (bloom,
// vignette, grain, depth of field…) as passes, without touching the scenes.
export function createFx(renderer, scene, camera) {
  const passes = []; // future: EffectComposer passes, in order

  return {
    passes,
    render() {
      renderer.render(scene, camera);
    },
    resize(/* width, height */) {},
  };
}
