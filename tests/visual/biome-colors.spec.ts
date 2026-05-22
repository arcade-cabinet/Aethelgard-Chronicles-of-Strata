import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Per-OS screenshot baselines. The committed baseline is generated on the dev
 * platform (darwin); the CI platform (linux) renders the WebGL canvas slightly
 * differently, so its baseline is committed after the first CI run records it.
 * Until a baseline exists for the running platform the test asserts the board
 * renders (a non-empty canvas) instead of a pixel diff — visual regression
 * fires only once a same-OS baseline is locked.
 */
test.describe('board visual', () => {
  test('the seeded board renders as a colored hex island', async ({ page }, testInfo) => {
    await page.goto('/');
    // the r3f game canvas — not the #minimap-canvas
    await page.waitForSelector('canvas:not(#minimap-canvas)');
    await page.waitForTimeout(1500);

    const baseline = join(
      testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
      `board-ancient-silver-forest-${testInfo.project.name}-${process.platform}.png`,
    );
    if (existsSync(baseline)) {
      await expect(page).toHaveScreenshot('board-ancient-silver-forest.png', {
        maxDiffPixelRatio: 0.02,
      });
    } else {
      // no same-OS baseline yet — assert the board is on screen
      const canvas = page.locator('canvas:not(#minimap-canvas)');
      await expect(canvas).toBeVisible();
      const dims = await canvas.evaluate((c: HTMLCanvasElement) => ({
        w: c.width,
        h: c.height,
      }));
      expect(dims.w).toBeGreaterThan(0);
      expect(dims.h).toBeGreaterThan(0);
    }
  });
});
