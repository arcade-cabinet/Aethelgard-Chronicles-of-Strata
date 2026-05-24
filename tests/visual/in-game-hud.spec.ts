import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.47 — in-game HUD baseline matrix.
 */
const MODES = [
  'border-clash',
  'frontier-raid',
  'long-reign',
  'strata-wars',
  'age-of-strata',
  'coexistence',
] as const;

for (const mode of MODES) {
  test.describe(`in-game HUD baseline (${mode})`, () => {
    test(`mode=${mode} renders deterministically`, async ({ page }, testInfo) => {
      await page.goto(`/?seed=polish-${mode}&mode=${mode}`);
      await enterGame(page, `polish-${mode}`);
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      await page.evaluate(() => {
        const w = window as unknown as { __game?: { advanceFrames?: (n: number) => void } };
        w.__game?.advanceFrames?.(300);
      });
      await page.waitForTimeout(500);

      const baseline = join(
        testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
        `hud-${mode}-${testInfo.project.name}-${process.platform}.png`,
      );
      const snapshotName = `hud-${mode}-${testInfo.project.name}.png`;
      if (existsSync(baseline)) {
        await expect(page).toHaveScreenshot(snapshotName, {
          maxDiffPixelRatio: 0.03,
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot(snapshotName, {
          animations: 'disabled',
        });
      }
    });
  });
}
