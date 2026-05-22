import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import staticAssetsPlugin from 'vite-static-assets-plugin';

export default defineConfig(({ mode }) => ({
  base: mode === 'github-pages' ? '/Aethelgard-Chronicles-of-Strata/' : '/',
  cacheDir: '.vite',
  build: {
    chunkSizeWarningLimit: 2000,
    target: 'es2022',
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
