import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.53 — day/night cycle baselines.
 *
 * 4 phases × project × platform. Forces game.clock.elapsed via
 * the dev-console accessor (each phase = DAY_LENGTH * { 0, 0.25,
 * 0.5, 0.75 } — dawn / noon / dusk / midnight).
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
        // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
        const g = (window as any).__game;
        if (g?.clock) {
          // DAY_LENGTH is exposed on WORLD config; if not at runtime,
          // 120s is the documented default in src/config/world.json.
          // biome-ignore lint/suspicious/noExplicitAny: WORLD config
          const dayLength = (window as any).WORLD?.dayLength ?? 120;
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
