import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * M_POLISH2.E2E.61 — mobile touch journey.
 *
 * Pure touch: tap a button, tap the BuildMenuButton FAB, tap the
 * mobile-system menu hamburger. NO keyboard, NO right-click.
 *
 * Pins the mobile-only UX path: every action a touch player needs
 * is reachable via tap.
 */
test('mobile touch journey — every player action reachable via tap', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(!isMobile && testInfo.project.name !== 'tablet', 'mobile-only spec');

  await enterGame(page, 'ancient-silver-forest');
  // Dismiss onboarding if present (via Skip tap).
  const skip = page.locator('button', { hasText: 'Skip' });
  if (await skip.count()) await skip.first().tap();

  // The mobile speed/pause pill is at top-right.
  await expect(page.locator('#mobile-speed-pause-pill')).toBeVisible({ timeout: 4000 });
  // Tap pause segment.
  await page.locator('#mobile-pause').tap();
  // Assert game.paused was flipped via the dev-console accessor.
  expect(
    await page.evaluate(() => {
      const w = window as unknown as { __game?: { paused?: boolean } };
      return Boolean(w.__game?.paused);
    }),
  ).toBe(true);
  // Tap pause again to resume.
  await page.locator('#mobile-pause').tap();
  expect(
    await page.evaluate(() => {
      const w = window as unknown as { __game?: { paused?: boolean } };
      return Boolean(w.__game?.paused);
    }),
  ).toBe(false);

  // BuildMenuButton FAB is at bottom-right; tap to surface the
  // SelectionPanel build buttons (B.1's open-build-menu listener
  // selects the player TownHall).
  await expect(page.locator('#hud-build-menu-button')).toBeVisible();
  await page.locator('#hud-build-menu-button').tap();
  await page.waitForTimeout(300);
  const selectedId = await page.evaluate(() => {
    const w = window as unknown as { __game?: { selectedId?: number } };
    return w.__game?.selectedId;
  });
  expect(selectedId).not.toBeUndefined();

  // MobileSystemMenu hamburger at top-left.
  await expect(page.locator('#mobile-system-menu-trigger')).toBeVisible();
  await page.locator('#mobile-system-menu-trigger').tap();
  await page.waitForTimeout(300);
  const settingsItem = page.locator('#mobile-system-menu-settings');
  if (await settingsItem.count()) {
    await expect(settingsItem).toBeVisible();
  }
});
