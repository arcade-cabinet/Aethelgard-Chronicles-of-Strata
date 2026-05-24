import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * Comprehensive Player Journey screenshot capture.
 *
 * Drives EVERY notable moment of the player journey + saves a PNG
 * to artifacts/journey/ for review. Runs only on demand:
 *
 *   pnpm test:e2e tests/e2e/journey-capture.spec.ts
 *
 * The screenshots become the lead agent's primary review surface
 * for visual quality (per user mandate — agent owns visuals, user
 * shouldn't have to point out a T-pose or palette issue).
 */
const OUT_DIR = 'artifacts/journey';

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

async function snap(page: import('@playwright/test').Page, slug: string): Promise<void> {
  await page.screenshot({
    path: join(OUT_DIR, `${slug}.png`),
    fullPage: false,
  });
}

test.describe('journey capture (manual review)', () => {
  test('00-title-screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title-heading');
    await page.waitForTimeout(700); // framer-motion entry settle
    await snap(page, '00-title-screen');
  });

  test('01-new-game-modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#title-screen');
    await page.click('#menu-new-game');
    await page.waitForSelector('#begin-game');
    await page.waitForTimeout(500);
    await snap(page, '01-new-game-modal');
  });

  test('02-settings-modal-from-title', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#menu-settings');
    await page.click('#menu-settings');
    // settings modal id is one of the dialog children; wait for a known toggle.
    await page.waitForSelector('#settings-colorblind', { timeout: 5000 });
    await page.waitForTimeout(500);
    await snap(page, '02-settings-modal-from-title');
  });

  test('03-game-fresh-start', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    await page.waitForTimeout(1500); // scene settle
    await snap(page, '03-game-fresh-start');
  });

  test('04-game-after-10s-sim', async ({ page }) => {
    test.setTimeout(60_000);
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.evaluate(() => {
      const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
      w.__game_advanceFrames?.(600);
    });
    await page.waitForTimeout(600);
    await snap(page, '04-game-after-10s-sim');
  });

  test('05-build-menu-open', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('aethelgard:open-build-menu'));
    });
    await page.waitForTimeout(400);
    await snap(page, '05-build-menu-open');
  });

  test('06-game-over-win', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.evaluate(() => {
      const w = window as unknown as { __game?: { outcome: string } };
      if (w.__game) w.__game.outcome = 'win';
    });
    await page.waitForTimeout(800);
    await snap(page, '06-game-over-win');
  });

  test('07-game-over-loss', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    await page.evaluate(() => {
      const w = window as unknown as { __game?: { outcome: string } };
      if (w.__game) w.__game.outcome = 'loss';
    });
    await page.waitForTimeout(800);
    await snap(page, '07-game-over-loss');
  });
});
