import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * GitHub Pages sirve el sitio bajo /<repo>/ (ej: /tamagotchi-online/),
 * mientras que en local sirve bajo /. Por eso el `base` viene de una env var:
 * el workflow de deploy define VITE_BASE=/tamagotchi-online/ (ver docs/06).
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
