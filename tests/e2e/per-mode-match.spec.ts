import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.E2E.57 — full-match e2e per mode (6 modes).
 *
 * Uses the AI-vs-AI URL boot path (`?ai-vs-ai=1&seed=&mode=`) because
 * NewGameModal randomises the mode picker — the URL path is the
 * deterministic way to drive a specific mode (see App.tsx
 * M_POLISH3.AIVAI.1 — `?mode=` IS honored when ai-vs-ai=1).
 */
const MODES = [
  { mode: 'border-clash', copy: 'Destroy enemy base' },
  { mode: 'frontier-raid', copy: 'Survive the raids' },
  { mode: 'long-reign', copy: 'Outlast the realm' },
  { mode: 'strata-wars', copy: 'Control the realm' },
  { mode: 'age-of-strata', copy: 'Reach the final era' },
  { mode: 'coexistence', copy: 'Sandbox' },
] as const;

for (const { mode, copy } of MODES) {
  test(`per-mode smoke: ${mode}`, async ({ page }) => {
    // advanceFrames(600) on a freshly-loaded WebGL scene under
    // headless Chromium can spike past the default 60s; bump to
    // 90s for the per-mode SMOKE specs.
    test.setTimeout(90_000);
    await page.goto(`/?ai-vs-ai=1&seed=e2e-${mode}&mode=${mode}`);
    // Wait for the dev-harness install (game mounted).
    await page.waitForFunction(
      () =>
        typeof (window as { __game_advanceFrames?: unknown }).__game_advanceFrames === 'function',
      { timeout: 60_000 },
    );
    // 600 frames = 10s game-time. Enough for peons to spawn + the
    // mode-specific HUD pills to surface, without a 60s sim run
    // that could blow the CI test budget under load.
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(600);
    });
    await page.waitForTimeout(400);

    await expect(page.locator('#win-condition-pill')).toContainText(copy);

    const outcome = await page.evaluate(() => {
      const w = window as unknown as { __game?: { outcome?: string } };
      return w.__game?.outcome ?? 'unknown';
    });
    expect(outcome).toBe('playing');
  });
}
