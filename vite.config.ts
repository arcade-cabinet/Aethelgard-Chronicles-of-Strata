import { readFileSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import staticAssetsPlugin from 'vite-static-assets-plugin';

// M_NEXT.PLAY.1 — derive app version from package.json so the
// TitleScreen footer always matches the shipped release (was
// hardcoded 'v0.2.0' while package was 0.1.0).
const pkgVersion = (
  JSON.parse(readFileSync(path.resolve('package.json'), 'utf8')) as { version: string }
).version;

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
  },
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
    // M_FUN.FOUNDATION.BUNDLE-VIZ — rollup-plugin-visualizer.
    // Writes a treemap to dist/bundle-stats.html on every prod
    // build. Agent + user can see where bundle weight lives
    // after each refactor.
    visualizer({
      filename: 'dist/bundle-stats.html',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    // Dev-only CSP relaxation. The production CSP in index.html
    // forbids 'unsafe-eval', which Vite's dev HMR + esbuild's CJS
    // wrappers rely on (lots of `(new Function(...))()` patterns
    // inside dependencies). Without this, `pnpm dev` shows a blank
    // page. The transform fires only when `mode === 'development'`,
    // so production builds keep the strict policy verbatim.
    {
      name: 'aethelgard-dev-csp-relax',
      apply: 'serve',
      transformIndexHtml(html: string) {
        // Dev also needs blob: in script-src because workers spawned
        // via `new Worker(URL.createObjectURL(...))` (yuka / our AI
        // workers) call `importScripts` from inside, and that import
        // is regulated by script-src — not worker-src. Production
        // bundles workers as separate URLs so this isn't needed there.
        return html.replace(
          /script-src 'self'/,
          // M_SEC_REVIEW.5 — dropped 'unsafe-inline'. Vite HMR
          // injects ES module <script type="module"> tags which
          // are NOT covered by 'unsafe-inline' anyway; allowing it
          // was broader than needed and would have allowed any
          // accidentally-introduced inline <script> XSS during dev.
          "script-src 'self' 'unsafe-eval' blob:",
        );
      },
    },
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
