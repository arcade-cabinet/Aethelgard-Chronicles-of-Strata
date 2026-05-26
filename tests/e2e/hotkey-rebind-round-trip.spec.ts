import { expect, test } from '@playwright/test';

/**
 * M_POLISH2.E2E.60 — hotkey rebinding round-trip (desktop only).
 */
// CI runner is 2-3× slower than local on the click-through flow; default
// 60s was tripping on CI post-v0.8 substrate work. v0.10 per-tick
// additions (M_GAME.BUG.10 roam-radius filter, walkable-step guard,
// stack-substrate query) push the runtime further — observed
// keyboard.press hanging at 120s on run 26439369678. 240s gives
// 2× headroom. Same pattern as PR #25 / PR #33 / PR #38.
test.setTimeout(240_000);
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
  // M_HUD.SHELL.3 — Begin button label changed from "Begin" to "Begin Match"
  // when NewGameModal got the cinematic Forge Your Realm treatment.
  const begin = page.locator('#begin-game');
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
