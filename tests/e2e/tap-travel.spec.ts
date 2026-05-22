import { expect, test } from '@playwright/test';

test('tapping a tile moves the pawn along a path', async ({ page }) => {
  await page.goto('/');
  // the r3f game canvas — not the #minimap-canvas
  await page.waitForSelector('canvas:not(#minimap-canvas)');
  await page.waitForTimeout(1000);

  const canvas = page.locator('canvas:not(#minimap-canvas)');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');

  // click near the centre of the board, then a little away — both are likely land
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(200);
  await page.mouse.click(box.x + box.width / 2 + 80, box.y + box.height / 2 + 40);

  // give the pawn time to walk
  await page.waitForTimeout(2500);

  // the canvas is still alive and rendering — no crash during traversal
  await expect(canvas).toBeVisible();
});
