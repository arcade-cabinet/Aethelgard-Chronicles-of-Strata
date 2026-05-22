import type { Page } from '@playwright/test';

/**
 * Drive the title screen → New Game modal → playing phase. The app boots to the
 * title screen; e2e tests that need the game running call this to click through
 * to the board and wait for the r3f canvas. Pass `seed` to start a deterministic
 * board (the modal otherwise randomizes the seed).
 */
export async function enterGame(page: Page, seed?: string): Promise<void> {
  await page.goto('/');
  await page.waitForSelector('#title-screen');
  await page.click('#menu-new-game');
  await page.waitForSelector('#begin-game');
  if (seed !== undefined) {
    await page.fill('#seed-input', seed);
  }
  await page.click('#begin-game');
  // the r3f game canvas — not the #minimap-canvas
  await page.waitForSelector('canvas:not(#minimap-canvas)');
}
