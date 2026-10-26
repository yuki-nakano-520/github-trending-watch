import { defineConfig } from 'vite';

export default defineConfig({
  root: 'site',
  // Collected JSON is served as static files next to the page.
  publicDir: '../data',
  // Relative base so the site works under https://<user>.github.io/<repo>/.
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
});
