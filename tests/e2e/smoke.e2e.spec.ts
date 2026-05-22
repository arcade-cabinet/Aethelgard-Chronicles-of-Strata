import { expect, test } from '@playwright/test';

test('app shell boots and mounts the game canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app-shell')).toBeVisible();
  await page.waitForSelector('canvas');
  await expect(page.locator('canvas')).toBeVisible();
});
