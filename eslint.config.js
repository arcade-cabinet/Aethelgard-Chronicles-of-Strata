/**
 * M_FUN.FOUNDATION.ESLINT — second-pass linter for rules Biome
 * cannot express. Biome owns formatting + most lint families;
 * ESLint runs ONLY for:
 *   - react-hooks/exhaustive-deps (Biome's useExhaustiveDependencies
 *     overlaps but has gaps that bit us during M_FUN.NAR work)
 *   - react-hooks/rules-of-hooks
 *
 * Run via `pnpm lint:eslint` (added to package.json scripts).
 * `pnpm lint` keeps the fast Biome pass; CI calls both.
 *
 * Flat-config (ESLint 9+) format.
 */
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2024,
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // Ignore tests + generated + assets.
  {
    ignores: [
      'dist/**',
      'android/**',
      'coverage/**',
      '.vite/**',
      '.claude/**',
      'src/static-assets.ts',
      'tests/**',
      'public/**',
    ],
  },
];
