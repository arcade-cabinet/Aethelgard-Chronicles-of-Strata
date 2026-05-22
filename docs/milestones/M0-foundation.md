# M0 — Foundation

**Proves:** Vite/TS/r3f boots; GLB+audio load; APK + GitHub Pages builds green;
pillar docs written.

**Source plan:**
`docs/superpowers/plans/2026-05-22-m0-foundation.md`

**M0 is complete when all contracts below are checked and CI is green.**

## Contracts

- [ ] **Task 1 — pnpm project + package.json** [`tests/unit/project-structure.test.ts`]
  - `package.json` has `name`, `version`, `type: "module"`, `engines.node ≥ 20`.
  - All runtime and dev dependencies declared; `pnpm install --frozen-lockfile` exits 0.
  - Scripts: `dev`, `build`, `build:pages`, `ingest`, `verify-assets`, `typecheck`,
    `lint`, `test:node`, `test:browser`, `test:e2e`, `cap:sync`, `cap:apk`.
  - Ref: `10-architecture.md §Technology Stack`.

- [ ] **Task 2 — TypeScript + Vite configuration** [`tests/unit/build.test.ts`]
  - `tsconfig.json` targets ESNext, strict mode on, path aliases configured.
  - `vite.config.ts` supports `development`, `web`, `github-pages`, `native` modes.
  - `pnpm build` and `pnpm build:pages` each complete without error.
  - Ref: `99-build-deploy.md §Vite Configuration`.

- [ ] **Task 3 — Biome lint/format** [`tests/unit/lint.test.ts` (shell-exec)]
  - `biome.json` present and valid.
  - `pnpm lint` exits 0 on the initial codebase.
  - Ref: `99-build-deploy.md §CI Gate List`.

- [ ] **Task 4 — Vitest configuration (node + browser projects)** [`tests/unit/vitest-smoke.test.ts`]
  - `vitest.config.ts` defines two projects: `node` (pure unit) and `browser`.
  - `pnpm test:node` runs and exits 0 on a trivial passing test.
  - `pnpm test:browser` runs a canvas smoke test and exits 0.
  - Ref: `99-build-deploy.md §CI Gate List`.

- [ ] **Task 5 — Playwright configuration** [`tests/visual/smoke.spec.ts`]
  - `playwright.config.ts` present; targets Chromium.
  - `pnpm test:e2e` runs `smoke.spec.ts` which navigates to `localhost:5173` and
    asserts the launcher heading is visible.
  - Ref: `99-build-deploy.md §CI Gate List`.

- [ ] **Task 6 — Capacitor Android configuration** [`tests/unit/capacitor.test.ts`]
  - `capacitor.config.ts` has correct `appId`, `appName: "Aethelgard"`, `webDir: "dist"`.
  - `android/` directory initialized (`npx cap add android` completed).
  - `pnpm cap:sync` exits 0 after a successful `pnpm build`.
  - Ref: `99-build-deploy.md §Native (Capacitor Android)`.

- [ ] **Task 7 — Asset manifest types + typed accessor** [`tests/unit/asset-accessor.test.ts`]
  - `AssetEntry`, `AssetManifest` types exported from `src/core/assets.ts`.
  - `createAssetAccessor(manifest)` returns a correctly typed object.
  - TypeScript rejects access to a logical ID not present in the manifest.
  - Ref: `30-asset-pipeline.md §The Typed Accessor`.

- [ ] **Task 8 — Ingest script** [`tests/unit/ingest.test.ts`]
  - `scripts/ingest-assets.ts` runs via `pnpm ingest` without error on the
    `references/` directory.
  - Produces `public/assets/manifest.json` matching the `AssetManifest` schema.
  - Idempotent: running twice yields identical output.
  - Ref: `30-asset-pipeline.md §The Ingest Flow`.

- [ ] **Task 9 — Asset verification script + contract test** [`tests/unit/asset-manifest.test.ts`]
  - `pnpm verify-assets` exits 0 when all manifest entries have on-disk files.
  - `asset-manifest.test.ts` asserts manifest version equals `EXPECTED_MANIFEST_VERSION`.
  - Test fails if any manifest entry has a broken path.
  - Ref: `30-asset-pipeline.md §Size Policy`.

- [ ] **Task 10 — Pillar documentation set** [`tests/unit/docs-present.test.ts`]
  - All 12 `docs/specs/*.md` files exist and are non-empty.
  - All 7 `docs/milestones/M*.md` files exist and are non-empty.
  - Ref: `00-overview.md §Milestone Map`.

- [ ] **Task 11 — GitHub Actions CI workflow** [`tests/unit/ci-config.test.ts` (shell-exec)]
  - `.github/workflows/ci.yml` exists and is valid YAML.
  - Workflow defines all 9 CI gates in order.
  - `act` dry-run (or yaml-parse test) exits 0.
  - Ref: `99-build-deploy.md §CI Gate List`.

- [ ] **Task 12 — GitHub Pages deploy workflow** [`tests/unit/pages-config.test.ts`]
  - `.github/workflows/pages.yml` exists.
  - Contains `deploy-pages` step with correct artifact path.
  - Ref: `99-build-deploy.md §GitHub Pages Deploy Workflow`.

- [ ] **Task 13 — Coverage gates + standard repo files** [`tests/unit/gates.test.ts`]
  - `.claude/gates.json` exists and is valid JSON matching the gate schema.
  - `README.md`, `LICENSE` present. (No `CREDITS.md` — this is a commercial
    release with commercially-licensed assets; see `30-asset-pipeline.md`.)
  - Ref: `30-asset-pipeline.md §Licensing`, `99-build-deploy.md §Coverage Gates`.
