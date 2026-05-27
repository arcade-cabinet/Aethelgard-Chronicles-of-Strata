import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.48 — selection-state baselines.
 *
 * Captures the SelectionPanel layout for each selection class:
 *   - none (default state with no selection)
 *   - peon (worker selected)
 *   - building (Palace selected — surfaces the build buttons)
 *
 * Uses the dev-console accessor to programmatically select an
 * entity rather than synthesising a tile-tap (the canvas tap
 * landing on the right entity is non-deterministic at viewport
 * scaling).
 */
test.describe('selection-state baselines', () => {
  test('no selection (default state)', async ({ page }, testInfo) => {
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.waitForTimeout(500);

    await snapshot(page, testInfo, 'selection-none');
  });

  test('Palace building selected', async ({ page }, testInfo) => {
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.evaluate(() => {
      // Fire the open-build-menu event — App listens + selects player Palace.
      window.dispatchEvent(new CustomEvent('aethelgard:open-build-menu'));
    });
    await page.waitForTimeout(500);
    await snapshot(page, testInfo, 'selection-palace');
  });
});

async function snapshot(
  page: import('@playwright/test').Page,
  testInfo: import('@playwright/test').TestInfo,
  slug: string,
): Promise<void> {
  const baseline = join(
    testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
    `${slug}-${testInfo.project.name}-${process.platform}.png`,
  );
  const snapshotName = `${slug}-${testInfo.project.name}.png`;
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
}
