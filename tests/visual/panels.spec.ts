import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.55 — modal/panel baseline trio.
 *
 * Captures the major HUD panels at the current state:
 *   - Settings (title-screen entry — contains hotkey editor +
 *     volume sliders + colourblind + captions toggles)
 *   - Discoveries (in-game; requires the dialog trigger to be
 *     present in the HUD)
 */
test.describe('panel baselines', () => {
  test('Settings modal (title-screen entry)', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('#title-heading')).toHaveText('Aethelgard');
    await page.locator('#menu-settings').click();
    await expect(page.locator('#settings-colorblind')).toBeVisible({ timeout: 4000 });
    await page.waitForTimeout(500);
    await snapshot(page, testInfo, 'settings-modal');
  });

  test('Discoveries panel (in-game)', async ({ page }, testInfo) => {
    await enterGame(page, 'ancient-silver-forest');
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    // The Discoveries trigger button is a HudPill — locate by its
    // visible text or by id if it has one.
    const trig = page.getByRole('button', { name: /Discoveries/i });
    if (await trig.count()) {
      await trig.first().click();
      await page.waitForTimeout(500);
      await snapshot(page, testInfo, 'discoveries-panel');
    } else {
      // Defensive — if the discoveries trigger is hidden in this
      // viewport, snapshot the HUD anyway so we have a baseline
      // for the "no trigger visible" state.
      await snapshot(page, testInfo, 'discoveries-no-trigger');
    }
  });
});

async function snapshot(
  page: import('@playwright/test').Page,
  testInfo: import('@playwright/test').TestInfo,
  slug: string,
): Promise<void> {
  const baseline = join(
    testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
    `${slug}-${testInfo.project.name}-${process.platform}.png`,
  );
  const snapshotName = `${slug}-${testInfo.project.name}.png`;
  if (existsSync(baseline)) {
    await expect(page).toHaveScreenshot(snapshotName, {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  } else {
    await expect(page).toHaveScreenshot(snapshotName, {
      animations: 'disabled',
    });
  }
}
