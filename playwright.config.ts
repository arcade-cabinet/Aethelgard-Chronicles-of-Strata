import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
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
