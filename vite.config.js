import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the site works under https://<user>.github.io/<repo>/
  base: './',
  server: { allowedHosts: ['terminal.local'] },
});
