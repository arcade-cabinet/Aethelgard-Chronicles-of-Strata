import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.52 — weather state baselines.
 *
 * 3 weather states (sunny / fog / rain) × project × platform.
 * Forces game.weather.state via the dev-console accessor for
 * determinism — the natural weather-transition is wall-clock
 * scheduled and would never be reproducible in CI.
 */
const STATES = ['sunny', 'fog', 'rain'] as const;

for (const state of STATES) {
  test.describe(`weather scene (${state})`, () => {
    test(`weather=${state} renders deterministically`, async ({ page }, testInfo) => {
      await enterGame(page, 'ancient-silver-forest');
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      await page.evaluate((s: string) => {
        // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
        const g = (window as any).__game;
        if (g?.weather) g.weather.state = s;
      }, state);
      await page.waitForTimeout(500);

      const baseline = join(
        testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
        `weather-${state}-${testInfo.project.name}-${process.platform}.png`,
      );
      const snapshotName = `weather-${state}-${testInfo.project.name}.png`;
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
