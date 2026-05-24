import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.50 — Victory + Defeat modal baseline pair (per
 * project × platform). Forces game.outcome via the dev-console
 * accessor (`window.__game.outcome = 'win' | 'loss'`).
 */
test.describe('game-over-modal visual baselines', () => {
  for (const outcome of ['win', 'loss'] as const) {
    test(`${outcome} modal locks across viewport + platform`, async ({ page }, testInfo) => {
      await enterGame(page, 'ancient-silver-forest');
      // Dismiss onboarding if present.
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      // Force outcome via the dev hook; GameOverModal listens on game.outcome.
      await page.evaluate((o: string) => {
        // biome-ignore lint/suspicious/noExplicitAny: dev-console game accessor
        const w = window as any;
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
