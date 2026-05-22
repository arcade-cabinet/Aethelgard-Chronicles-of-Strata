import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/Aethelgard-Chronicles-of-Strata/' : '/',
  cacheDir: '.vite',
  build: { chunkSizeWarningLimit: 2000, target: 'es2022' },
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
}));
