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

## GitHub repository settings (M_AUDIT2.SEC2.37)

Settings the audit assumes are configured at the repo level (these
cannot live in a YAML file — they are GitHub UI/API state):

**General → Pull Requests**
- Allow squash merging: ON (the only enabled merge type)
- Allow merge commits: OFF
- Allow rebase merging: OFF
- Automatically delete head branches: ON

**Branches → main**
- Branch protection rule enabled
- Require a pull request before merging: ON
- Require approvals: 1
- Dismiss stale pull-request approvals when new commits are pushed: ON
- Require status checks to pass before merging: ON
  - Required: `lint`, `typecheck`, `test`, `build`, `android-apk`, `codeql`, `dep-review`
- Require branches to be up to date before merging: ON
- Require conversation resolution before merging: ON
- Require signed commits: ON (paired with `gh auth setup-git` + GPG key)
- Include administrators: ON (no `--admin` merge escape hatch)
- Allow force pushes: OFF
- Allow deletions: OFF

**Code security and analysis**
- Dependabot alerts: ON
- Dependabot security updates: ON
- Code scanning (CodeQL): ON (workflow already in `.github/workflows/ci.yml`)
- Secret scanning: ON
- Secret scanning push protection: ON

**Actions → General**
- Actions permissions: "Allow enterprise, and select non-enterprise, actions and reusable workflows"
  - Allow actions created by GitHub: ON
  - Allow specified actions (SHA-pinned in our workflows already)
- Workflow permissions: "Read repository contents and packages permissions" (least-privilege; per-job permissions blocks grant more where needed)
- Fork PRs: "Require approval for all outside collaborators"

**Pages**
- Source: GitHub Actions (deploy-pages.yml owns the publish)
- Custom domain: (none — repo-scoped subpath is fine)

**Secrets and variables → Actions** (required by release.yml)
- `ANDROID_SIGNING_KEYSTORE_B64` — base64 of release.keystore
- `ANDROID_SIGNING_KEY_ALIAS` — key alias inside the keystore
- `ANDROID_SIGNING_KEY_PASSWORD` — password for that key
- `ANDROID_SIGNING_STORE_PASSWORD` — keystore password

Any change to this list needs a corresponding update in the workflows
that consume the secret. The keystore itself is held offline.
