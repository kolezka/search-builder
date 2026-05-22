import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // Workspace deps ship raw .ts via "main": "src/index.ts" — vite must
  // bundle them into the SSR output so `node build/index.js` doesn't try
  // to require a .ts file at runtime.
  ssr: {
    noExternal: ['@search-builder/api', '@search-builder/engines', '@search-builder/types'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_ORIGIN ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
