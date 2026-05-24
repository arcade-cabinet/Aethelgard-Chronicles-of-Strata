import { defineConfig, devices } from '@playwright/test';

// CI-default match: just e2e specs. The M_POLISH2.VISUAL.* visual
// baseline specs are opt-in via VISUAL=1 env (they ship baselines
// on first-run + require committed PNGs to be useful; running them
// on every CI is slow + would generate noise without the baselines
// committed). Use `VISUAL=1 pnpm test:e2e` locally to lock baselines.
const includeVisual = process.env.VISUAL === '1';
const testMatch = includeVisual
  ? ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts']
  : ['e2e/**/*.spec.ts'];

// Per-test timeout (each test). Most e2e specs settle under 20s;
// the per-mode SMOKE specs do 60s of sim then assert, so the
// generous default protects them from runner cold-start variance.
const TEST_TIMEOUT_MS = 60_000;

export default defineConfig({
  testDir: './tests',
  testMatch,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: TEST_TIMEOUT_MS,
  use: { baseURL: 'http://localhost:8080', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm build && pnpm preview',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // M_POLISH2.MOBILE.13 — tablet branch (iPad Mini portrait).
    // The mobile/desktop split skipped the 768-1024 width range
    // entirely; adding this project lets visual baselines + e2e
    // flows cover it.
    { name: 'tablet', use: { ...devices['iPad Mini'] } },
  ],
});
