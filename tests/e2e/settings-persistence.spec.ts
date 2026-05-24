import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.E2E.59 — settings persistence round-trip.
 *
 * Open Settings → flip colourblind on + captions on → reload page →
 * assert flags persisted in Preferences AND re-applied on mount.
 *
 * Runs in every project (desktop + mobile + tablet).
 */
test('settings persistence: colourblind + captions survive a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#title-heading')).toHaveText('Aethelgard');

  // Open Settings from the title screen.
  await page.locator('#menu-settings').click();
  // Wait for the modal.
  await expect(page.locator('#settings-colorblind')).toBeVisible({ timeout: 4000 });

  // Flip both toggles to ON.
  const cb = page.locator('#settings-colorblind');
  const cap = page.locator('#settings-captions');
  // Read current state by aria-pressed.
  const cbPressedBefore = await cb.getAttribute('aria-pressed');
  if (cbPressedBefore === 'false') await cb.click();
  const capPressedBefore = await cap.getAttribute('aria-pressed');
  if (capPressedBefore === 'false') await cap.click();

  // Reload — values should rehydrate from Preferences.
  await page.reload();
  await page.locator('#menu-settings').click();
  await expect(page.locator('#settings-colorblind')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#settings-captions')).toHaveAttribute('aria-pressed', 'true');
});
