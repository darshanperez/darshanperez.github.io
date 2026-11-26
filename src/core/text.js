import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dur, ease, sec, text } from '../styles/tokens.js';

// Default text pattern (§18.3): triggered when the scroll crosses a point and
// played in real time, so it looks smooth at any scroll speed. Entering grows
// 0.96 → 1; leaving forward grows past the camera (→ 1.04). Scrolling back
// mirrors it.

const cues = [];

/** ScrollTrigger position `v` viewports below the container's top. */
export const at = (v) => `top${v < 0 ? '-=' : '+='}${Math.abs(v) * window.innerHeight} top`;

function lines(el) {
  const parts = el.querySelectorAll('[data-line]');
  return parts.length ? [...parts] : [el];
}

function show(el, dir) {
  const targets = lines(el);
  gsap.killTweensOf(targets);
  gsap.set(el, { autoAlpha: 1 });
  gsap.fromTo(
    targets,
    { autoAlpha: 0, scale: dir > 0 ? text.enterScale : text.exitScale },
    { autoAlpha: 1, scale: 1, duration: sec(dur.enter), ease: ease.enter.gsap, stagger: sec(text.stagger) },
  );
}

function hide(el, dir) {
  const targets = lines(el);
  gsap.killTweensOf(targets);
  gsap.to(targets, {
    autoAlpha: 0,
    scale: dir > 0 ? text.exitScale : text.enterScale,
    duration: sec(dur.exit),
    ease: ease.exit.gsap,
    stagger: sec(text.stagger),
    onComplete: () => gsap.set(el, { autoAlpha: 0 }),
  });
}

/**
 * Shows `el` while the scroll is between `from` and `to`, measured in
 * viewports from the top of `container`.
 */
export function cue(container, el, from, to) {
  const st = ScrollTrigger.create({
    trigger: container,
    start: () => at(from),
    end: () => at(to),
    onEnter: () => show(el, 1),
    onLeave: () => hide(el, 1),
    onEnterBack: () => show(el, -1),
    onLeaveBack: () => hide(el, -1),
  });
  cues.push({ el, st });
}

/** Shows the cues that are already active (e.g. scene 1 at scroll 0). */
export function syncCues(scrollY) {
  for (const { el, st } of cues) {
    if (scrollY >= st.start && scrollY < st.end) show(el, 1);
  }
}
