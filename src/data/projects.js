// Modular project list (§8). Texts live in strings.csv under
// project.<id>.title / .role / .desc / .long. Media paths are relative to
// public/ and resolved with import.meta.env.BASE_URL.
//   media:  looping muted video (mp4/webm), or null for an image-only window
//   poster: still image, shown until the video plays (or instead of it)
// [PENDING] descriptions and media are placeholders until Darshan records them.
const m = (id, video = true) => ({
  media: video ? `media/projects/${id}.mp4` : null,
  poster: `media/projects/${id}.webp`,
});

export const projects = [
  // Main
  { id: 'sia', main: true, ...m('sia'), tags: ['Full-stack'], links: { live: 'https://sia.ifc.unam.mx', repo: null } },
  { id: 'airport-db', main: true, ...m('airport-db'), tags: [], links: { live: null, repo: null } },
  { id: 'distributed', main: true, ...m('distributed'), tags: [], links: { live: null, repo: null } },
  { id: 'luciernagas', main: true, ...m('luciernagas', false), tags: [], links: { live: null, repo: null } },
  { id: 'ai-model', main: true, ...m('ai-model'), tags: [], links: { live: null, repo: null } },
  { id: 'cp-instructor', main: true, ...m('cp-instructor'), tags: [], links: { live: null, repo: null } },
  // Secondary
  { id: 'tongue-kde', main: false, ...m('tongue-kde', false), tags: [], links: { live: null, repo: null } },
  { id: 'mini-lisp', main: false, ...m('mini-lisp'), tags: [], links: { live: null, repo: null } },
  { id: 'open-source', main: false, ...m('open-source'), tags: [], links: { live: null, repo: null } },
  { id: 'minecraft', main: false, ...m('minecraft', false), tags: [], links: { live: 'https://modrinth.com/user/darshanperez', repo: null } },
  { id: 'feria-unam', main: false, ...m('feria-unam', false), tags: [], links: { live: null, repo: null } },
  { id: 'ds-library', main: false, ...m('ds-library'), tags: [], links: { live: null, repo: null } },
  { id: 'cc-skills', main: false, ...m('cc-skills'), tags: [], links: { live: null, repo: null } },
];
