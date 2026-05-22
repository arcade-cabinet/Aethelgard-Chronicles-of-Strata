import { expect, test } from '@playwright/test';

test('app shell boots and mounts the game canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app-shell')).toBeVisible();
  // the r3f game canvas — not the #minimap-canvas
  await page.waitForSelector('canvas:not(#minimap-canvas)');
  await expect(page.locator('canvas:not(#minimap-canvas)')).toBeVisible();
});
