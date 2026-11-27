// Modular project list (§8). Texts live in strings.csv under
// project.<id>.title / .role / .desc / .long. Media paths are relative to
// public/ and resolved with import.meta.env.BASE_URL.
//
//   kind:   'main'      — the focus of a beat: large, in front, full opacity
//           'secondary' — 2–3 per beat, on the other side, smaller
//           'filler'    — background windows that fill the corridor; small label
//   beat:   (secondary only, optional) id of the main project it appears
//           with. Without it, secondaries are shared out evenly.
//   media:  looping muted video (mp4/webm), or null for an image-only window
//   poster: still image, shown until the video plays (or instead of it)
//
// Order matters: mains play in this order; secondaries keep theirs inside a beat.
// [PENDING] media are placeholders until Darshan records them.
const m = (id, video = true) => ({
  media: video ? `media/projects/${id}.mp4` : null,
  poster: `media/projects/${id}.webp`,
});
const none = { live: null, repo: null };

export const projects = [
  // Main — one beat each
  { id: 'sia', kind: 'main', ...m('sia'), tags: ['Full-stack'], links: { live: 'https://sia.ifc.unam.mx', repo: null } },
  { id: 'distributed', kind: 'main', ...m('distributed'), tags: [], links: none },
  { id: 'ai-model', kind: 'main', ...m('ai-model'), tags: [], links: none },
  { id: 'open-source', kind: 'main', ...m('open-source'), tags: [], links: none },

  // Secondary — two per beat, grouped by theme
  { id: 'luciernagas', kind: 'secondary', beat: 'sia', ...m('luciernagas', false), tags: [], links: none },
  { id: 'ifc-classes', kind: 'secondary', beat: 'sia', ...m('ifc-classes'), tags: [], links: none },
  { id: 'airport-db', kind: 'secondary', beat: 'distributed', ...m('airport-db'), tags: [], links: none },
  { id: 'ds-library', kind: 'secondary', beat: 'distributed', ...m('ds-library'), tags: [], links: none },
  { id: 'mini-lisp', kind: 'secondary', beat: 'ai-model', ...m('mini-lisp'), tags: [], links: none },
  { id: 'cc-agents', kind: 'secondary', beat: 'ai-model', ...m('cc-agents'), tags: [], links: none },
  { id: 'minecraft', kind: 'secondary', beat: 'open-source', ...m('minecraft', false), tags: [], links: { live: 'https://modrinth.com/user/darshanperez', repo: null } },
  { id: 'cp-instructor', kind: 'secondary', beat: 'open-source', ...m('cp-instructor'), tags: [], links: none },

  // Filler — background only (still listed in scene 15). Interleaved: real
  // projects, then [EXAMPLE] ones (typical small CS-grad projects) that only
  // fill the corridor until Darshan replaces or removes them.
  { id: 'nixos', kind: 'filler', ...m('nixos', false), tags: [], links: none },
  { id: 'chip8-emu', kind: 'filler', example: true, ...m('chip8-emu', false), tags: [], links: none },
  { id: 'feria-unam', kind: 'filler', ...m('feria-unam', false), tags: [], links: none },
  { id: 'raytracer', kind: 'filler', example: true, ...m('raytracer', false), tags: [], links: none },
  { id: 'dotfiles', kind: 'filler', ...m('dotfiles', false), tags: [], links: none },
  { id: 'sudoku-solver', kind: 'filler', example: true, ...m('sudoku-solver', false), tags: [], links: none },
  { id: 'tongue-kde', kind: 'filler', ...m('tongue-kde', false), tags: [], links: none },
  { id: 'socket-chat', kind: 'filler', example: true, ...m('socket-chat', false), tags: [], links: none },
  { id: 'java-libs', kind: 'filler', ...m('java-libs', false), tags: [], links: none },
  { id: 'pathfinding', kind: 'filler', example: true, ...m('pathfinding', false), tags: [], links: none },
  { id: 'rust-counter', kind: 'filler', ...m('rust-counter', false), tags: [], links: none },
  { id: 'game-of-life', kind: 'filler', example: true, ...m('game-of-life', false), tags: [], links: none },
  { id: 'markov-text', kind: 'filler', example: true, ...m('markov-text', false), tags: [], links: none },
  { id: 'url-shortener', kind: 'filler', example: true, ...m('url-shortener', false), tags: [], links: none },
  { id: 'huffman', kind: 'filler', example: true, ...m('huffman', false), tags: [], links: none },
  { id: 'mini-shell', kind: 'filler', example: true, ...m('mini-shell', false), tags: [], links: none },
];
