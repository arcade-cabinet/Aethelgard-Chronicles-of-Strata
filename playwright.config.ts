import { defineConfig, devices } from '@playwright/test';

// THREE config tiers — each maps to a clearly-named pnpm script
// so contributors run the right one BEFORE pushing:
//
//   pnpm test:e2e             default — desktop only, e2e specs
//                              only, fast. The CI gate.
//
//   pnpm test:e2e:multiview   adds mobile + tablet projects
//                              (still e2e specs only). Run
//                              before shipping a HUD/touch change.
//
//   pnpm test:e2e:visual      adds the tests/visual/* baseline
//                              specs across all 3 projects. Slow;
//                              used to lock baselines + check drift.
//                              Not in default CI.
//
// CI-default = tier 1. Multi-project + visual are opt-in.
const includeVisual = process.env.VISUAL === '1';
const includeMultiview = process.env.MULTIVIEW === '1' || includeVisual;
const testMatch = includeVisual
  ? ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts']
  : ['e2e/**/*.spec.ts'];

// Per-test timeout. Most e2e settle under 20s; the per-mode SMOKE
// specs do sim work, so 60s default protects runner cold-start.
const TEST_TIMEOUT_MS = 60_000;

const allProjects = [
  { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile', use: { ...devices['Pixel 7'] } },
  // M_POLISH2.MOBILE.13 — tablet branch (iPad Mini portrait).
  { name: 'tablet', use: { ...devices['iPad Mini'] } },
];
const projects = includeMultiview ? allProjects : [allProjects[0]!];

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
  projects,
});
