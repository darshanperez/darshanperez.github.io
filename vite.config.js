import { defineConfig } from 'vite';
import { toCss } from './src/styles/tokens.js';

// Generates `virtual:tokens.css` from src/styles/tokens.js.
function tokensCss() {
  const id = 'virtual:tokens.css';
  const resolved = '\0' + id + '.css';
  return {
    name: 'tokens-css',
    resolveId: (source) => (source === id ? resolved : null),
    load: (source) => (source === resolved ? toCss() : null),
  };
}

export default defineConfig({
  // The Pages workflow passes the repo's base path ('/portfolio/' for a project
  // site, '/' for darshanperez.github.io), so renaming the repo needs no change here.
  base: process.env.BASE_PATH || '/',
  plugins: [tokensCss()],
  // three.js alone is ~600 KB raw; the real budget is < 250 KB gzip (§10).
  build: { chunkSizeWarningLimit: 800 },
});
