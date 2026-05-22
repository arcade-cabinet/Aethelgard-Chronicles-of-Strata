# Build and Deploy

## Vite Configuration

The Vite config (`vite.config.ts`) supports three build modes via the `MODE` env var:

| Mode | `base` path | Output dir | Purpose |
|---|---|---|---|
| `development` (default) | `/` | `dist/` | Local dev server |
| `web` | `/` | `dist/` | Plain web deployment |
| `github-pages` | `/Aethelgard-Chronicles-of-Strata/` | `dist/` | GitHub Pages (repo sub-path) |
| `native` | `/` | `dist/` | Capacitor sync source |

```typescript
// vite.config.ts (key excerpts)
export default defineConfig(({ mode }) => ({
  base: mode === "github-pages"
    ? "/Aethelgard-Chronicles-of-Strata/"
    : "/",
  plugins: [react()],
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 4000, // GLBs and Howler are large; warning threshold raised
  },
  test: {
    // configured in vitest.config.ts — see CI section
  },
}));
```

## Three Build Targets

### 1. Web / GitHub Pages

```bash
pnpm build:pages   # MODE=github-pages vite build
```

Output: `dist/` with the correct base path for Pages. Deployed by the GitHub Actions
workflow `.github/workflows/pages.yml` on every push to `main`.

### 2. Native (Capacitor Android)

```bash
pnpm build         # MODE=native vite build (base "/")
pnpm cap:sync      # npx cap sync android
pnpm cap:apk       # npx cap run android --target=device (assembleDebug)
```

Or via Gradle directly:
```bash
cd android && ./gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

The Capacitor config (`capacitor.config.ts`) sets:
```typescript
{
  appId: "com.aethelgard.strata",
  appName: "Aethelgard",
  webDir: "dist",
  android: { buildOptions: { keystorePath: undefined } }, // debug signing
}
```

### 3. Local Dev

```bash
pnpm dev
```

Vite dev server on `http://localhost:5173`. Hot module replacement enabled.

## GitHub Pages Deploy Workflow

`.github/workflows/pages.yml`:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm ingest           # generate manifest.json
      - run: pnpm build:pages      # MODE=github-pages vite build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

## CI Gate List

`.github/workflows/ci.yml` — runs on every push and PR to any branch.

Gates, in order (all must pass):

1. **`pnpm install --frozen-lockfile`** — lockfile integrity.
2. **`pnpm ingest`** — asset pipeline runs without error.
3. **`pnpm verify-assets`** — all manifest entries have matching files on disk.
4. **`pnpm typecheck`** — `tsc --noEmit` passes with zero errors.
5. **`pnpm lint`** — Biome lint passes with zero errors.
6. **`pnpm test:node`** — Vitest node-mode tests pass (pure unit tests for `core/`
   and `ecs/systems/`).
7. **`pnpm test:browser`** — Vitest browser-mode tests pass (r3f component behavior,
   canvas smoke test).
8. **`pnpm test:e2e`** — Playwright end-to-end tests pass (launcher loads, game
   starts, hex board renders).
9. **`pnpm build`** — production build completes without error.

APK build (`pnpm cap:apk`) runs in a separate job on pushes to `main` only (requires
Java/SDK; too slow for every PR).

## Coverage Gates

`coverage_rules` in `.claude/gates.json`:

| Rule | Scope | Requirement | Override |
|---|---|---|---|
| visual-coverage | `src/render/**`, `src/world/**`, `src/entities/**` | Any commit must include `tests/visual/**` update OR commit body has `// no-visual-impact: <reason ≥ 10 words>` | see comment syntax |
| ecs-coverage | `src/ecs/systems/**` | Must include `tests/unit/**` update OR `// no-test-impact: <reason>` | see comment syntax |

`ban_patterns`:
- `Math.random()` in `src/core/` or `src/ecs/` — must use seeded PRNG.
- `console.log` in production code (warnings and errors only via `console.warn`/`console.error`).

## Milestone-TDD Workflow

Each milestone begins with a TDD batch before any implementation:

1. Write `docs/milestones/MN-<slug>.md` with the complete contract list.
2. Write all failing tests in `tests/` that pin those contracts (one commit per test
   or logical group of related tests).
3. Run `pnpm test:node && pnpm test:browser` — confirm all new tests are RED.
4. Implement the milestone features, turning tests GREEN one at a time.
5. When all milestone tests are GREEN: the milestone is done by construction.

The CI gate list runs on every commit, so RED tests block merges automatically.
