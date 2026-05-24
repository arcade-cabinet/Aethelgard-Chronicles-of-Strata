import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.E2E.60 — hotkey rebinding round-trip (desktop only).
 */
test('hotkey rebind round-trip — desktop only', async ({ page, isMobile }, testInfo) => {
  test.skip(isMobile, 'M_POLISH2.E2E.60 — hotkeys are desktop-only per user mandate');
  test.skip(
    testInfo.project.name === 'tablet',
    'M_POLISH2.E2E.60 — hotkeys are desktop-only per user mandate',
  );

  await page.goto('/');
  await expect(page.locator('#title-heading')).toHaveText('Aethelgard');

  await page.locator('#menu-settings').click();
  const buildFarmRow = page.getByRole('button', { name: /Rebind Build Farm/i });
  await expect(buildFarmRow).toBeVisible({ timeout: 4000 });
  await buildFarmRow.click();
  await page.keyboard.press('q');
  await expect(buildFarmRow).toContainText('Q', { timeout: 2000 });
  await page.getByRole('button', { name: /^Done$/ }).click();

  await page.locator('#menu-new-game').click();
  const begin = page.getByRole('button', { name: /^Begin$/i });
  if (await begin.count()) await begin.click();
  await expect(page.locator('canvas:not(#minimap-canvas)')).toBeVisible();

  const fireCountBefore = await page.evaluate(() => {
    const w = window as unknown as {
      __triggerBuildCount?: number;
      __triggerBuildLastType?: string;
    };
    w.__triggerBuildCount = 0;
    w.__triggerBuildLastType = '';
    window.addEventListener('aethelgard:trigger-build', (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: string } | undefined;
      w.__triggerBuildCount = (w.__triggerBuildCount ?? 0) + 1;
      w.__triggerBuildLastType = detail?.type ?? '';
    });
    return w.__triggerBuildCount;
  });
  expect(fireCountBefore).toBe(0);
  await page.keyboard.press('q');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => {
    const w = window as unknown as {
      __triggerBuildCount?: number;
      __triggerBuildLastType?: string;
    };
    return { count: w.__triggerBuildCount ?? 0, type: w.__triggerBuildLastType ?? '' };
  });
  expect(after.count).toBe(1);
  expect(after.type).toBe('Farm');
});
