import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.VISUAL.45 — title screen baseline matrix.
 *
 * Locks the launcher across 3 viewports × 2 platforms (darwin/linux).
 * The platform suffix mirrors the biome-colors spec — different
 * platforms render type + the gold gradient with different
 * subpixel rounding, so each platform has its own baseline.
 *
 * First run on a fresh platform records the baseline instead of
 * failing (existsSync gate). Subsequent runs require pixel match
 * (within maxDiffPixelRatio).
 */
test.describe('title-screen visual baselines', () => {
  test('launcher locks across viewport + platform', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#title-heading')).toHaveText('Aethelgard');
    // Wait for the font + button styles to settle (web font load,
    // framer-motion entry, gradient paint).
    await page.waitForTimeout(700);

    const baseline = join(
      testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
      `title-screen-${testInfo.project.name}-${process.platform}.png`,
    );
    if (existsSync(baseline)) {
      await expect(page).toHaveScreenshot(`title-screen-${testInfo.project.name}.png`, {
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });
    } else {
      // First-run baseline lock — generates the PNG without failing.
      await expect(page).toHaveScreenshot(`title-screen-${testInfo.project.name}.png`, {
        animations: 'disabled',
      });
    }
  });
});
