import { siGithub, siCodeforces, siModrinth } from 'simple-icons';

// Inline SVG icons (24×24, currentColor). Brand marks from Simple Icons (CC0);
// LinkedIn is no longer in Simple Icons, so it and the envelope are drawn here.
const brand = (icon) => `<path d="${icon.path}"/>`;

const shapes = {
  github: brand(siGithub),
  codeforces: brand(siCodeforces),
  modrinth: brand(siModrinth),
  linkedin:
    '<path fill-rule="evenodd" d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm1.5 7.5V19h3V9.5h-3ZM7 4.75a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM10.5 9.5V19h3v-5c0-1.3.7-2.1 1.75-2.1S17 12.7 17 14v5h3v-5.6c0-2.9-1.6-4.1-3.6-4.1-1.4 0-2.4.6-2.9 1.4V9.5h-3Z"/>',
  mail:
    '<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M3 5.5h18v13H3z"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="m3.5 6 8.5 7 8.5-7"/>',
};

export function icon(slug) {
  const body = shapes[slug];
  if (!body) return '';
  return `<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}
