import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { scroll } from '../styles/tokens.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/** Lenis smooth scroll driven by GSAP's ticker, synced with ScrollTrigger. */
export function createScroll(onFrame) {
  const lenis = new Lenis({ lerp: scroll.lerp, wheelMultiplier: scroll.wheelMultiplier, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    onFrame();
  });
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

/**
 * Master timeline: one scrubbed timeline for scenes 1–14, pinned on `stage`.
 * Timeline time is measured in viewports, so each scene's `scrollLength` is
 * both its duration and its scroll distance. Reordering, removing or
 * lengthening a scene is just editing the list or a number.
 */
export function createMasterTimeline({ scenes, ctx, container, stage }) {
  const total = scenes.reduce((sum, s) => sum + s.scrollLength, 0);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: container,
      start: 'top top',
      end: () => `+=${total * window.innerHeight}`,
      pin: stage,
      scrub: scroll.scrub,
      invalidateOnRefresh: true,
    },
  });

  let at = 0;
  for (const scene of scenes) {
    scene.init?.(ctx);
    tl.addLabel(scene.id, at);
    scene.build?.(tl, ctx, { start: at, length: scene.scrollLength });
    at += scene.scrollLength;
  }
  tl.set({}, {}, total); // pad so timeline duration === total scroll length

  return { tl, total };
}
