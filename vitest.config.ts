import { readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import staticAssetsPlugin from 'vite-static-assets-plugin';
import { defineConfig } from 'vitest/config';

// M_NEXT.PLAY.1 — mirror the vite.config define so tests that mount
// the TitleScreen (browser project) resolve __APP_VERSION__ instead
// of throwing ReferenceError. Reads package.json#version the same way.
const pkgVersion = (
  JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as { version: string }
).version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
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
          // M_FUN.ARCH.HARNESS — tests/harness/**/*.browser.test.tsx
          // is the per-feature visual-isolation harness. Same browser
          // pool as tests/browser/** so a single `pnpm test:browser`
          // run executes both.
          include: [
            'tests/browser/**/*.browser.test.{ts,tsx}',
            'tests/harness/**/*.browser.test.{ts,tsx}',
          ],
          setupFiles: ['tests/browser/setup-sqlite.ts'],
          // M_HUD.SHELL.21 — serialize browser tests. The shared
          // Playwright Chromium pool flakes under parallel load
          // (biome-swatch + n-player-picker + wildfire-layer collide
          // and time out). Serialization adds ~20s to the suite but
          // eliminates the flakes that were blocking the push gate.
          fileParallelism: false,
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
