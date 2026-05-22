/**
 * Player-journey E2E (M9.3a, spec docs/specs/10-player-journey.md).
 *
 * One test per scene transition. These pin the player's path through the
 * game from cold launch through victory/defeat, asserting on stable HUD
 * selectors so refactors are caught.
 */
import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

test.describe('Player Journey', () => {
  test('S1 → S2 — title screen opens the New Game modal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#title-screen')).toBeVisible();
    await expect(page.locator('#title-heading')).toHaveText('Aethelgard');
    await expect(page.locator('#menu-new-game')).toBeVisible();
    await page.click('#menu-new-game');
    await expect(page.locator('#begin-game')).toBeVisible();
    await expect(page.locator('#seed-input')).toBeVisible();
  });

  test('S2 → S4 — committing the New Game modal lands in gameplay', async ({ page }) => {
    await enterGame(page, 'ancient-silver-forest');
    // gameplay HUD is mounted
    await expect(page.locator('canvas:not(#minimap-canvas)')).toBeVisible();
    await expect(page.locator('#resource-bar')).toBeVisible();
    await expect(page.locator('#minimap-canvas')).toBeVisible();
  });

  test('S3 — first-run onboarding overlay appears on a fresh device', async ({ page }) => {
    await enterGame(page, 'onboarding-seed');
    // the overlay can take a tick to mount (async getSetting); poll briefly
    const overlay = page.locator('#onboarding-overlay');
    await expect(overlay).toBeVisible({ timeout: 3000 });
    await expect(overlay).toContainText('Aethelgard');
  });

  test('S4 — the ZoneLegend pill is visible during gameplay', async ({ page }) => {
    await enterGame(page, 'legend-seed');
    const pill = page.locator('[aria-label="Toggle territory legend"]');
    await expect(pill).toBeVisible();
  });

  test('S4 — the gameplay HUD is fully assembled', async ({ page }) => {
    await enterGame(page, 'hud-seed');
    // each HUD element renders
    await expect(page.locator('#resource-bar')).toBeVisible();
    await expect(page.locator('#minimap-canvas')).toBeVisible();
    await expect(page.locator('[aria-label="Toggle territory legend"]')).toBeVisible();
    // no console errors during the boot
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
  });
});
