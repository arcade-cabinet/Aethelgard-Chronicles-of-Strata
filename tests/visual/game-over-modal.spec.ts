import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.50 — Victory + Defeat modal baselines.
 */
test.describe('game-over-modal visual baselines', () => {
  for (const outcome of ['win', 'loss'] as const) {
    test(`${outcome} modal locks across viewport + platform`, async ({ page }, testInfo) => {
      await enterGame(page, 'ancient-silver-forest');
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      await page.evaluate((o: string) => {
        const w = window as unknown as { __game?: { outcome: string } };
        if (w.__game) w.__game.outcome = o;
      }, outcome);
      await page.waitForTimeout(700);
      await expect(page.locator('#game-over-modal')).toBeVisible();

      const file = `game-over-${outcome}-${testInfo.project.name}-${process.platform}.png`;
      const baseline = join(
        testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
        file,
      );
      const snapshotName = `game-over-${outcome}-${testInfo.project.name}.png`;
      if (existsSync(baseline)) {
        await expect(page).toHaveScreenshot(snapshotName, {
          maxDiffPixelRatio: 0.02,
          animations: 'disabled',
        });
      } else {
        await expect(page).toHaveScreenshot(snapshotName, {
          animations: 'disabled',
        });
      }
    });
  }
});
