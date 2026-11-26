import 'virtual:tokens.css';
import 'lenis/dist/lenis.css';
import './styles/fonts.css';
import './styles/base.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadStrings, applyTranslations, setLang, lang, onLangChange } from './core/i18n.js';
import { detectQuality } from './core/quality.js';
import { createRenderer } from './core/renderer.js';
import { createScroll, createMasterTimeline } from './core/timeline.js';
import { cue, syncCues } from './core/text.js';
import { links } from './data/links.js';
import { icon } from './data/icons.js';
import { scenes } from './scenes/index.js';
import { dur, ease, sec } from './styles/tokens.js';

const $ = (sel) => document.querySelector(sel);

function renderLinks() {
  for (const list of document.querySelectorAll('[data-links]')) {
    const where = list.dataset.links;
    list.replaceChildren(
      ...links
        .filter((l) => l.scenes.includes(where))
        .map((l) => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = l.url;
          a.innerHTML = icon(l.icon);
          const label = document.createElement('span');
          label.className = 'link-label';
          label.dataset.i18n = `link.${l.id}`;
          a.append(label);
          if (!l.url.startsWith('mailto:')) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
          li.append(a);
          return li;
        }),
    );
  }
}

function resolveAssets() {
  for (const el of document.querySelectorAll('[data-asset-href]')) {
    el.href = import.meta.env.BASE_URL + el.dataset.assetHref;
  }
}

function setupLangSwitch() {
  const buttons = document.querySelectorAll('[data-lang]');
  const sync = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang())));
  buttons.forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  onLangChange(sync);
  sync();
}

async function boot() {
  await loadStrings();
  renderLinks();
  resolveAssets();
  applyTranslations();
  setupLangSwitch();

  const quality = detectQuality();
  const gl = createRenderer($('#webgl'), quality);
  const lenis = createScroll(gl.render);

  const container = $('#experience');
  const ctx = {
    ...gl,
    quality,
    container,
    fade: $('#fade'),
    layer: (id) => container.querySelector(`[data-scene="${id}"]`),
    cue: (el, from, to) => cue(container, el, from, to),
  };
  await Promise.all(scenes.map((s) => s.load?.(ctx)));
  createMasterTimeline({ scenes, ctx, container, stage: $('#stage') });

  // Scene 15: stop rendering WebGL and hide the canvas; hide Skip.
  const about = $('#about');
  ScrollTrigger.create({
    trigger: about,
    start: 'top center',
    onEnter: () => gl.setEnabled(false),
    onLeaveBack: () => gl.setEnabled(true),
  });
  ScrollTrigger.create({
    trigger: about,
    start: 'top bottom',
    toggleClass: { targets: '#skip', className: 'is-hidden' },
  });

  const skip = $('#skip');
  skip.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(history.state, '', '#about');
    lenis.scrollTo(about, {
      duration: sec(dur.scene),
      easing: gsap.parseEase(ease.move.gsap),
      onComplete: () => about.focus({ preventScroll: true }),
    });
  });

  await document.fonts.ready;
  ScrollTrigger.refresh();
  lenis.resize(); // pick up the pin spacing ScrollTrigger just added
  if (location.hash === '#about') lenis.scrollTo(about, { immediate: true, force: true });
  ScrollTrigger.update();
  syncCues(window.scrollY);

  document.body.removeAttribute('aria-busy');
  gsap.to('#loader', {
    autoAlpha: 0,
    duration: sec(dur.exit),
    ease: ease.exit.gsap,
    onComplete: () => $('#loader').remove(),
  });
}

boot().catch((err) => {
  console.error(err);
  document.body.removeAttribute('aria-busy');
  $('#loader')?.remove();
});
