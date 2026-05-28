import { defineConfig, devices } from '@playwright/test';

/**
 * Aethelgard e2e + visual test configuration.
 *
 * Patterned on ../mean-streets — vite dev server (NOT build + preview),
 * WebGL-friendly Chromium flags, viewport tiers via env vars rather
 * than always-on multi-project explosion.
 *
 * Three opt-in tiers:
 *
 *   pnpm test:e2e             desktop project, e2e specs only,
 *                              vite dev server. ~30s of test time
 *                              over a 60s setup + teardown. The
 *                              CI gate.
 *
 *   pnpm test:e2e:multiview   adds mobile (Pixel 7) + tablet
 *                              (iPad Mini) Playwright projects.
 *                              Run before HUD/touch changes.
 *
 *   pnpm test:e2e:visual      adds tests/visual/* baseline specs
 *                              across all projects.
 */

const IS_CI = !!process.env.CI;
const IS_HEADLESS = process.env.PW_HEADLESS === '1' || IS_CI;
const CHROMIUM_CHANNEL =
  process.env.PW_CHROMIUM_CHANNEL ?? (!IS_CI && !IS_HEADLESS ? 'chrome' : undefined);

const DEFAULT_PORT = 4173;
const configuredPort = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PW_PORT);
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT;
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const REUSE_SERVER = !IS_CI && process.env.PW_REUSE_SERVER === '1';

// M_POLISH3.SCENE.1 — root cause of canvas-blank was 3 of 5
// public/assets/fonts/*.ttf files being HTML 404 pages, not TTFs;
// troika-three-text threw on first <Text> render and tore down the
// whole r3f Scene. Default Chromium args work; no GPU flags needed.

const includeVisual = process.env.VISUAL === '1';
const includeMultiview = process.env.MULTIVIEW === '1' || includeVisual;
// M_POLISH3.B.3 — journey-capture / AI-vs-AI / per-mode / weather /
// day-night / modal / selection / viewport-matrix specs are AGENT
// REVIEW HARNESSES (artefact producers, not functional gates). They
// take 5-7 minutes total and balloon CI past its 8-minute budget.
// CI runs only the tier-1 functional e2e; the journey suite is
// opt-in via JOURNEY=1 for on-demand artefact generation runs.
const includeJourney = process.env.JOURNEY === '1' || includeVisual;
const JOURNEY_SPECS = [
  'e2e/journey-capture.spec.ts',
  'e2e/ai-vs-ai-playthrough.spec.ts',
  'e2e/ai-vs-ai-balance.spec.ts',
  'e2e/per-mode-journey.spec.ts',
  'e2e/per-mode-match.spec.ts',
  'e2e/weather-journey.spec.ts',
  'e2e/day-night-journey.spec.ts',
  'e2e/modal-journey.spec.ts',
  'e2e/selection-journey.spec.ts',
  'e2e/viewport-matrix-journey.spec.ts',
  // M_V11.E2E.PERF-MOBILE — perf trace is an on-demand artefact
  // capture (rAF frame-interval sampling on a Pixel-7 viewport).
  // p95 has run-to-run variance under headless WebGL load that
  // makes it unsafe as a tier-1 gate. Opt-in via JOURNEY=1.
  'e2e/perf-mobile-trace.spec.ts',
  // M_V11.CI.FLAKE — n-player-camp-clear runs a 24000-frame burst
  // in a single page.evaluate that times out under CI's WebGL load
  // (~240s wall on GitHub-hosted runners, intermittent). The
  // deterministic version of the same contract lives in
  // tests/browser/barbarian-camp-clear.browser.test.ts; this
  // playwright spec was the artifact capture for the multi-faction
  // tick stability. Opt-in via JOURNEY=1 for on-demand runs.
  'e2e/n-player-camp-clear.spec.ts',
];
const baseE2eGlob = 'e2e/**/*.spec.ts';
const testMatch = includeVisual ? [baseE2eGlob, 'visual/**/*.spec.ts'] : [baseE2eGlob];
const testIgnore = includeJourney ? [] : JOURNEY_SPECS;

// CI runner is consistently 2-3× slower than local since v0.5+v0.6+v0.7
// substrate (more entities per tick, more renderers, more ECS systems).
// Pattern of one-off per-test bumps (PR #25, #33, #38, #40) was getting
// tiring; lift global CI defaults instead. 180s per test + 60s per action
// gives 3× headroom over the worst observed (tap-travel 60s wall) without
// masking a real perf regression — a real regression would blow past 180s.
const TEST_TIMEOUT_MS = IS_CI ? 180_000 : 45_000;
const ACTION_TIMEOUT_MS = IS_CI ? 60_000 : 15_000;
const NAV_TIMEOUT_MS = IS_CI ? 30_000 : 15_000;

const allProjects = [
  {
    name: 'desktop',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1280, height: 720 },
    },
  },
  { name: 'mobile', use: { ...devices['Pixel 7'] } },
  { name: 'tablet', use: { ...devices['iPad Mini'] } },
  // User feedback (OnePlus Open foldable unfolded): HUD overlap +
  // grey board. The foldable form factor sits between tablet + phone
  // — wide ~840 CSS-px viewport but Android UA, touch primary, 3x DPR.
  {
    name: 'foldable-portrait',
    use: {
      ...devices['Pixel 7'],
      viewport: { width: 840, height: 2120 },
      deviceScaleFactor: 3,
    },
  },
  {
    name: 'foldable-landscape',
    use: {
      ...devices['Pixel 7'],
      viewport: { width: 2120, height: 840 },
      deviceScaleFactor: 3,
    },
  },
  {
    name: 'ultrawide',
    use: { ...devices['Desktop Chrome'], viewport: { width: 3440, height: 1440 } },
  },
];
// allProjects is a non-empty const literal — TS can prove the [0] access
// is defined without a non-null assertion. Use `at(0) ?? allProjects[0]`
// pattern via destructure to satisfy biome's noNonNullAssertion.
const [firstProject] = allProjects;
const projects = includeMultiview ? allProjects : firstProject ? [firstProject] : allProjects;

export default defineConfig({
  testDir: './tests',
  testMatch,
  testIgnore,
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  reporter: IS_CI ? 'github' : 'list',
  timeout: TEST_TIMEOUT_MS,
  use: {
    baseURL: BASE_URL,
    headless: IS_HEADLESS,
    // M_FUN.FOUNDATION.PW-TRACE — retain a trace on EVERY failed
    // run (not just retry-triggered ones) so first-attempt failures
    // are debuggable from the CI artifact alone. CI's upload-artifact
    // step already pulls test-results/ on failure.
    trace: 'retain-on-failure',
    actionTimeout: ACTION_TIMEOUT_MS,
    navigationTimeout: NAV_TIMEOUT_MS,
    browserName: 'chromium',
    channel: CHROMIUM_CHANNEL,
    // M_POLISH3.SCENE.1 — drop GAME_ARGS entirely while triaging
    // the canvas-blank issue. Even with --enable-webgl the headless
    // Chromium may need different launch config to composite r3f
    // properly. Default args worked in mean-streets — start from
    // that baseline.
    // launchOptions: { args: GAME_ARGS },
  },
  webServer: {
    // vite dev (not build + preview) — dev server is ~2-3s warmup vs
    // ~30s for build + preview. The dev HMR + asset path semantics
    // match what tests + screenshots verify in real-life dev use.
    //
    // VITE_E2E=1 disables the static-assets `public/` watcher (see
    // vite.config.ts M_V13.HARNESS.NO-RELOAD-UNDER-E2E). Without it, a
    // parallel-worker filesystem event regenerates src/static-assets.ts
    // and Vite full-reloads a spec's page mid-test → "__game not ready".
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT}`,
    env: { VITE_E2E: '1' },
    url: BASE_URL,
    reuseExistingServer: REUSE_SERVER,
    timeout: 60_000,
  },
  projects,
});
