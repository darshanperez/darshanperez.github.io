import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { projects } from '../data/projects.js';
import { colors, ease } from '../styles/tokens.js';
import { placeholderCube, enterExit } from './_placeholder.js';
import { at } from '../core/text.js';

// Scenes 9–13 — Project windows, the light, white. Phase 1: one cube for the
// tunnel, then the page background crossfades to white (scene 13).
const TUNNEL = 0.6 * projects.length;
const LIGHT = 1.5;
const WHITE = 0.5;

let cube;
export default {
  id: 'projects',
  scrollLength: TUNNEL + LIGHT + WHITE,
  init(ctx) {
    cube = placeholderCube(ctx, { size: 1.2 });
  },
  build(tl, ctx, { start }) {
    enterExit(tl, cube, { start, length: TUNNEL });
    ctx.cue(ctx.layer('projects').querySelector('.cue'), start + 0.2, start + TUNNEL);
    tl.fromTo(
      document.documentElement,
      { '--bg': colors.ink },
      { '--bg': colors.snow, duration: LIGHT, ease: ease.move.gsap, immediateRender: false },
      start + TUNNEL,
    );
    // From mid-light on, fixed UI (Skip) switches to its light-background style.
    ScrollTrigger.create({
      trigger: ctx.container,
      start: () => at(start + TUNNEL + LIGHT / 2),
      end: 'max',
      toggleClass: { targets: document.documentElement, className: 'is-light' },
    });
  },
};
