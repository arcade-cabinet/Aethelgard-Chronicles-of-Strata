import path from 'node:path';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    // r3f + React 19 in browser mode: force a single React instance so hooks
    // resolve against one renderer (otherwise useMemo reads from a null
    // dispatcher and crashes).
    dedupe: ['react', 'react-dom'],
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
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.browser.test.{ts,tsx}'],
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
