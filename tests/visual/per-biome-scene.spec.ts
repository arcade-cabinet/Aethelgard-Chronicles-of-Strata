import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.51 — per-biome scene baselines.
 *
 * 4 representative seeds — one per dominant biome family. Each
 * seed produces a board where the camera-anchor sits over the
 * named biome, so a baseline captures the per-biome palette +
 * decoration silhouette + character contrast.
 *
 * 4 seeds × 3 viewports × 2 platforms = 24 baselines.
 *
 * Catches palette / decoration drift between releases — a forest
 * biome that suddenly renders blue is an immediate red baseline.
 */
const BIOME_SEEDS = [
  { biome: 'forest', seed: 'ancient-silver-forest' },
  { biome: 'plain', seed: 'open-rolling-plain' },
  { biome: 'mountain', seed: 'jagged-stone-mountain' },
  { biome: 'water', seed: 'still-blue-coast' },
] as const;

for (const { biome, seed } of BIOME_SEEDS) {
  test.describe(`biome scene (${biome})`, () => {
    test(`seed=${seed} renders deterministically`, async ({ page }, testInfo) => {
      await enterGame(page, seed);
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      await page.waitForTimeout(1500);

      const baseline = join(
        testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
        `biome-${biome}-${testInfo.project.name}-${process.platform}.png`,
      );
      const snapshotName = `biome-${biome}-${testInfo.project.name}.png`;
      if (existsSync(baseline)) {
        await expect(page).toHaveScreenshot(snapshotName, {
          maxDiffPixelRatio: 0.04,
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
