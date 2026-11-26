// Single source of truth for design (§17) and motion (§18) tokens.
// CSS custom properties are generated from this file at build time
// (see the `tokens-css` plugin in vite.config.js), and WebGL code imports
// it directly, so CSS and Three.js always agree. Do not add values that
// are not in the spec.

export const colors = {
  ink: '#070709', //          oklch(0.13 0.006 285)  — background, scenes 1–12
  graphite: '#19191D', //     oklch(0.215 0.008 285) — raised dark surfaces, text on light
  mist: '#F3F3F7', //         oklch(0.965 0.005 285) — light surfaces, text on dark
  snow: '#FAFAFC', //         oklch(0.985 0.003 285) — background, scenes 13–15
  grayOnDark: '#A4A4AB', //   oklch(0.72 0.010 285)
  grayOnLight: '#686870', //  oklch(0.52 0.012 285)
  accentOnDark: '#9992FA', // oklch(0.71 0.15 285)   — iris
  accentOnLight: '#5E45CD', // oklch(0.50 0.20 285)
  danger: '#FF534B', //       oklch(0.68 0.21 27)
};

export const type = {
  caption: { size: '13px', lineHeight: 1.4, tracking: '0.01em' },
  body: { size: '17px', lineHeight: 1.5, tracking: '0' },
  title: { size: '27px', lineHeight: 1.2, tracking: '-0.01em' },
  heading: { size: 'clamp(27px, 5vw, 44px)', lineHeight: 1.1, tracking: '-0.02em' },
  display: { size: 'clamp(44px, 8vw, 72px)', lineHeight: 1.0, tracking: '-0.03em' },
};

export const fonts = {
  sans: '"Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"Fragment Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

export const space = { unit: 8, fine: 4 }; // px

// Durations in ms (φ scale, base 200).
export const dur = { micro: 200, ui: 320, exit: 520, enter: 840, scene: 1370 };

export const ease = {
  enter: { gsap: 'expo.out', css: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  exit: { gsap: 'power2.in', css: 'cubic-bezier(0.55, 0, 1, 0.45)' },
  move: { gsap: 'power2.inOut', css: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  bounce: { gsap: 'back.out(1.6)' },
  linear: { gsap: 'none', css: 'linear' },
};

// Default text pattern (§18.3).
export const text = { enterScale: 0.96, exitScale: 1.04, stagger: 80 };

// Scroll (§18.4).
export const scroll = { lerp: 0.1, wheelMultiplier: 1, scrub: 1, marqueeSpeed: 40 };

/** Seconds, for GSAP. */
export const sec = (ms) => ms / 1000;

/** CSS custom properties for :root, generated from the tokens above. */
export function toCss() {
  const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const lines = [];
  for (const [k, v] of Object.entries(colors)) lines.push(`--${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(type)) {
    lines.push(`--fs-${k}: ${v.size};`, `--lh-${k}: ${v.lineHeight};`, `--ls-${k}: ${v.tracking};`);
  }
  lines.push(`--font-sans: ${fonts.sans};`, `--font-mono: ${fonts.mono};`);
  lines.push(`--space: ${space.unit}px;`, `--space-fine: ${space.fine}px;`);
  for (const [k, v] of Object.entries(dur)) lines.push(`--dur-${k}: ${v}ms;`);
  for (const [k, v] of Object.entries(ease)) if (v.css) lines.push(`--ease-${k}: ${v.css};`);
  return `:root {\n  ${lines.join('\n  ')}\n}\n`;
}
