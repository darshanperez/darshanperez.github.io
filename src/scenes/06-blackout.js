import { ease } from '../styles/tokens.js';

// Scene 6 — Full fade to black, tied to the scroll. Once the screen is black,
// the earlier acts are hidden and the camera goes back home for act 3.
export default {
  id: 'blackout',
  scrollLength: 0.5,
  build(tl, ctx, { start, length }) {
    const end = start + length;
    tl.to(ctx.fade, { opacity: 1, duration: length * 0.8, ease: ease.move.gsap }, start)
      .set(ctx.act('profile'), { visible: false }, end)
      .set(ctx.act('servers'), { visible: false }, end)
      .set(ctx.camera.position, { x: ctx.HOME.position.x, y: ctx.HOME.position.y, z: ctx.HOME.position.z }, end)
      .set(ctx.cameraTarget, { x: ctx.HOME.target.x, y: ctx.HOME.target.y, z: ctx.HOME.target.z }, end)
      .set(ctx.fade, { opacity: 0 }, end);
  },
};
