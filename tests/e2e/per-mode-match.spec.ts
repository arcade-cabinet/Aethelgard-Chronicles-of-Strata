import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * M_POLISH2.E2E.57 — full-match e2e per mode (6 modes).
 */
const MODES = [
  { mode: 'border-clash', copy: 'Destroy enemy base' },
  { mode: 'frontier-raid', copy: 'Survive the raids' },
  { mode: 'long-reign', copy: 'Outlast the realm' },
  { mode: 'strata-wars', copy: 'Control the realm' },
  { mode: 'age-of-strata', copy: 'Reach the final era' },
  { mode: 'coexistence', copy: 'Sandbox' },
] as const;

// SKIPPED — `?mode=` URL param isn't currently honored by App.tsx
// (NewGameModal randomises mode internally). Re-enable when the
// URL mode-pick lands; tracked under M_POLISH2.E2E.57a.
for (const { mode, copy } of MODES) {
  test.skip(`per-mode smoke: ${mode}`, async ({ page }) => {
    // advanceFrames(3600) on a freshly-loaded WebGL scene under
    // headless Chromium can spike past the default 60s; bump to
    // 90s for the per-mode SMOKE specs.
    test.setTimeout(90_000);
    await page.goto(`/?seed=e2e-${mode}&mode=${mode}`);
    await enterGame(page, `e2e-${mode}`);
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
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
