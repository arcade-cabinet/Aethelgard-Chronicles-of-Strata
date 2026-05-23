import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import staticAssetsPlugin from 'vite-static-assets-plugin';

export default defineConfig(({ mode }) => ({
  // M_SEC.29 — base URL precedence: env override > mode-detection >
  // root. Lets CI deploy to a custom path without touching this file
  // (set VITE_BASE in the deploy job's env).
  base:
    process.env.VITE_BASE ?? (mode === 'github-pages' ? '/Aethelgard-Chronicles-of-Strata/' : '/'),
  cacheDir: '.vite',
  build: {
    chunkSizeWarningLimit: 2000,
    target: 'es2022',
    // M_AUDIT2.SEC2.48 — never emit sourcemaps in production builds.
    // GitHub Pages serves the dist/ tree publicly; a stray .map file
    // would expose the full original TS source + comment-marked
    // architecture decisions. Vite's default is already false, but
    // setting it explicitly defends against a future plugin or
    // env-driven override flipping it on by accident.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/sql.js') ||
            id.includes('node_modules/jeep-sqlite') ||
            id.includes('node_modules/@capacitor-community/sqlite')
          ) {
            return 'db-vendor';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    staticAssetsPlugin({
      directory: 'public',
      outputFile: 'src/static-assets.ts',
      ignore: ['.DS_Store'],
    }),
  ],
  optimizeDeps: {
    include: ['three/examples/jsm/utils/SkeletonUtils.js'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    // single three instance — r3f + drei + direct three imports
    dedupe: ['three'],
  },
}));
