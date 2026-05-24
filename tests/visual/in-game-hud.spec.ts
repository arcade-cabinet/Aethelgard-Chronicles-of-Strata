import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.47 — in-game HUD baseline matrix.
 *
 * One screenshot per (game-mode × project × platform). Uses
 * enterGame to start a fresh deterministic session per mode;
 * advances 300 ticks via the dev-console `window.__game.advanceFrames`
 * hook to get past the title flicker + into a meaningful playing
 * state.
 *
 * 6 modes × 3 viewports × 2 platforms = 36 baselines that lock on
 * the next `pnpm test:e2e` run.
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
      // enterGame already navigates / and clicks New Game; we extend
      // with a query param so the URL drives mode selection. If the
      // app doesn't yet honour `?mode=`, the New Game modal stays on
      // its default — that's still a baseline-locking screenshot for
      // the default mode, just less useful for the per-mode polish
      // story.
      await page.goto(`/?seed=polish-${mode}&mode=${mode}`);
      await enterGame(page, `polish-${mode}`);
      const skip = page.locator('button', { hasText: 'Skip' });
      if (await skip.count()) await skip.first().click();
      // Advance 300 frames (5s @ 60Hz) so peons start moving and the
      // HUD displays a meaningful state.
      await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
        const w = window as any;
        if (w.__game?.advanceFrames) w.__game.advanceFrames(300);
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
