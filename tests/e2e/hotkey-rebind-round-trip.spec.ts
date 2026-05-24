import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.E2E.60 — hotkey rebinding round-trip (desktop only).
 *
 * Open Settings → HotkeyEditor → rebind 'build.Farm' to 'q' →
 * close → start a game → press 'q' → assert the trigger-build
 * event fired with type='Farm'.
 *
 * Mobile-skipped per user mandate: hotkeys are not the priority
 * because they don't work in mobile. Mobile users get the build
 * affordance via the BuildMenuButton FAB (B.1) instead.
 */
test('hotkey rebind round-trip — desktop only', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'M_POLISH2.E2E.60 — hotkeys are desktop-only per user mandate');
  test.skip(
    testInfo.project.name === 'tablet',
    'M_POLISH2.E2E.60 — hotkeys are desktop-only per user mandate',
  );

  await page.goto('/');
  await expect(page.locator('#title-heading')).toHaveText('Aethelgard');

  // Open Settings → scroll to HotkeyEditor row for build.Farm.
  await page.locator('#menu-settings').click();
  const buildFarmRow = page.getByRole('button', { name: /Rebind Build Farm/i });
  await expect(buildFarmRow).toBeVisible({ timeout: 4000 });
  // Click the row to enter listening mode.
  await buildFarmRow.click();
  // Press 'q' — the global keydown listener inside HotkeyEditor
  // captures + writes.
  await page.keyboard.press('q');
  // The button text should now read "Q" (prettyKey upper-cases single chars).
  await expect(buildFarmRow).toContainText('Q', { timeout: 2000 });
  // Close settings.
  await page.getByRole('button', { name: /^Done$/ }).click();

  // Start a game so KeyboardShortcuts is live.
  await page.locator('#menu-new-game').click();
  const begin = page.getByRole('button', { name: /^Begin$/i });
  if (await begin.count()) await begin.click();
  await expect(page.locator('canvas:not(#minimap-canvas)')).toBeVisible();

  // Install a listener for aethelgard:trigger-build before pressing.
  const fireCountBefore = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: dev-test hook
    const w = window as any;
    w.__triggerBuildCount = 0;
    w.__triggerBuildLastType = null;
    w.addEventListener('aethelgard:trigger-build', (e: Event) => {
      w.__triggerBuildCount++;
      w.__triggerBuildLastType = (e as CustomEvent).detail?.type;
    });
    return w.__triggerBuildCount;
  });
  expect(fireCountBefore).toBe(0);
  // Press the rebound key.
  await page.keyboard.press('q');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    // biome-ignore lint/suspicious/noExplicitAny: dev-test hook
    count: (window as any).__triggerBuildCount as number,
    // biome-ignore lint/suspicious/noExplicitAny: dev-test hook
    type: (window as any).__triggerBuildLastType as string,
  }));
  expect(after.count).toBe(1);
  expect(after.type).toBe('Farm');
});
