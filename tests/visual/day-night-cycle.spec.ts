import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.53 — day/night cycle baselines.
 */
const PHASES = [
  { name: 'dawn', fraction: 0 },
  { name: 'noon', fraction: 0.25 },
  { name: 'dusk', fraction: 0.5 },
  { name: 'midnight', fraction: 0.75 },
] as const;

for (const { name, fraction } of PHASES) {
  test.describe(`day/night phase (${name})`, () => {
    test(`phase=${name} renders deterministically`, async ({ page }, testInfo) => {
      await enterGame(page, 'ancient-silver-forest');
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      await page.evaluate((f: number) => {
        const w = window as unknown as {
          __game?: { clock?: { elapsed: number } };
          WORLD?: { dayLength?: number };
        };
        const g = w.__game;
        if (g?.clock) {
          const dayLength = w.WORLD?.dayLength ?? 120;
          g.clock.elapsed = dayLength * f;
        }
      }, fraction);
      await page.waitForTimeout(600);

      const baseline = join(
        testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
        `daynight-${name}-${testInfo.project.name}-${process.platform}.png`,
      );
      const snapshotName = `daynight-${name}-${testInfo.project.name}.png`;
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
