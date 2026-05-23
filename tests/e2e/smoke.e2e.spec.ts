import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

test('app shell boots and mounts the game canvas', async ({ page }) => {
  await enterGame(page);
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('canvas:not(#minimap-canvas)')).toBeVisible();
});

test('the title screen shows before the game starts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#title-heading')).toHaveText('Aethelgard');
  await expect(page.locator('#menu-new-game')).toBeVisible();
});
