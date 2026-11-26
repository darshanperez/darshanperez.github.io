// Modular project list (§8). Texts live in strings.csv under
// project.<id>.title / .role / .desc / .long. Media paths are relative to
// public/ and resolved with import.meta.env.BASE_URL.
// [PENDING] descriptions and media: placeholders until Darshan provides them.
export const projects = [
  // Main
  { id: 'sia', main: true, media: null, poster: null, tags: ['Full-stack'], links: { live: 'https://sia.ifc.unam.mx', repo: null } },
  { id: 'airport-db', main: true, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'distributed', main: true, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'luciernagas', main: true, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'ai-model', main: true, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'cp-instructor', main: true, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  // Secondary
  { id: 'tongue-kde', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'mini-lisp', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'open-source', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'minecraft', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'feria-unam', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'ds-library', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
  { id: 'cc-skills', main: false, media: null, poster: null, tags: [], links: { live: null, repo: null } },
];
