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
const testMatch = includeVisual
  ? ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts']
  : ['e2e/**/*.spec.ts'];

const TEST_TIMEOUT_MS = IS_CI ? 60_000 : 45_000;
const ACTION_TIMEOUT_MS = IS_CI ? 30_000 : 15_000;
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
];
const projects = includeMultiview ? allProjects : [allProjects[0]!];

export default defineConfig({
  testDir: './tests',
  testMatch,
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  reporter: IS_CI ? 'github' : 'list',
  timeout: TEST_TIMEOUT_MS,
  use: {
    baseURL: BASE_URL,
    headless: IS_HEADLESS,
    trace: 'on-first-retry',
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
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: REUSE_SERVER,
    timeout: 60_000,
  },
  projects,
});
