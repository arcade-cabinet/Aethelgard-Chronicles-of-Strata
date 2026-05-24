import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.VISUAL.46 — NewGameModal baseline trio.
 *
 * Same existsSync-baseline pattern as title-screen.spec.ts: per
 * (project × platform) baseline file with maxDiffPixelRatio 0.02;
 * first-run on a fresh platform records the baseline.
 */
test.describe('new-game-modal visual baselines', () => {
  test('default modal state locks across viewport + platform', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#title-heading')).toHaveText('Aethelgard');
    await page.locator('#menu-new-game').click();
    // Wait for the modal to mount + framer-motion entry to settle.
    await page.waitForTimeout(700);
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();

    const baseline = join(
      testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
      `new-game-modal-${testInfo.project.name}-${process.platform}.png`,
    );
    if (existsSync(baseline)) {
      await expect(page).toHaveScreenshot(`new-game-modal-${testInfo.project.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot(`new-game-modal-${testInfo.project.name}.png`, {
        animations: 'disabled',
      });
    }
  });
});
