import path from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import staticAssetsPlugin from 'vite-static-assets-plugin';

export default defineConfig({
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
    // Exclude jeep-sqlite from pre-bundling: its WASM initialises as a
    // side-effect of being bundled and fails in headless Chromium.
    exclude: ['jeep-sqlite', 'sql.js'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    // Force single instances: React (r3f hooks need one renderer) and three
    // (r3f + drei + direct imports otherwise double-load the three module).
    dedupe: ['react', 'react-dom', 'three'],
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts', 'src/main.tsx'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'src/**/__tests__/**/*.test.ts',
            'tests/unit/**/*.test.ts',
            'scripts/**/__tests__/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './src'),
            // Replace capacitor-sqlite with a no-op stub in browser tests.
            // The real package triggers jeep-sqlite WASM load as a module
            // evaluation side-effect, which fails in headless Chromium.
            '@capacitor-community/sqlite': path.resolve(
              __dirname,
              'tests/browser/__mocks__/@capacitor-community/sqlite.ts',
            ),
          },
        },
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.browser.test.{ts,tsx}'],
          setupFiles: ['tests/browser/setup-sqlite.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
