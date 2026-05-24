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

for (const { mode, copy } of MODES) {
  test(`per-mode smoke: ${mode}`, async ({ page }) => {
    await page.goto(`/?seed=e2e-${mode}&mode=${mode}`);
    await enterGame(page, `e2e-${mode}`);
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.evaluate(() => {
      const w = window as unknown as { __game?: { advanceFrames?: (n: number) => void } };
      w.__game?.advanceFrames?.(3600);
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
