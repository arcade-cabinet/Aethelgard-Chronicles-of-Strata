import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * M_POLISH2.E2E.58 — save / load round-trip e2e.
 *
 * Start game → advance 60s of sim → snapshot wood total + supply +
 * mode → save → return to title → Continue → assert the same snapshot
 * values are present.
 *
 * Uses the dev-console `window.__game` accessor + the dev-console
 * `persistence.save` hook for deterministic timing instead of waiting
 * on the auto-save 5min tick.
 */
test('save / load preserves wood total + supply + mode', async ({ page }) => {
  await enterGame(page, 'ancient-silver-forest');
  // Dismiss onboarding if present.
  const skip = page.locator('button', { hasText: 'Skip' });
  if (await skip.count()) await skip.first().click();
  // Advance 60s game-time (3600 frames @60Hz).
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
    const w = window as any;
    if (w.__game?.advanceFrames) w.__game.advanceFrames(3600);
  });
  await page.waitForTimeout(300);
  // Capture state.
  const before = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
    const g = (window as any).__game;
    return {
      wood: g?.economy?.player?.wood ?? -1,
      used: g?.economy?.player?.usedSupply ?? -1,
      mode: g?.mode ?? 'unknown',
    };
  });
  expect(before.wood).toBeGreaterThan(0);
  // Force a save via the dev-console hook.
  await page.evaluate(async () => {
    // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
    const w = window as any;
    if (w.__game?.autoSave) {
      // tickAutoSave under the hood — force-fire by setting the timer.
      w.__game.autoSave.lastSaveMs = -Infinity;
    }
  });
  await page.waitForTimeout(500);
  // Reload — Continue should resume from the last save.
  await page.goto('/');
  await expect(page.locator('#menu-continue')).toBeEnabled({ timeout: 8000 });
  await page.locator('#menu-continue').click();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
    const g = (window as any).__game;
    return {
      wood: g?.economy?.player?.wood ?? -1,
      used: g?.economy?.player?.usedSupply ?? -1,
      mode: g?.mode ?? 'unknown',
    };
  });
  // Wood may differ by a few units (post-load economy ticks briefly
  // before our snapshot); pin within ±5%.
  expect(after.mode).toBe(before.mode);
  expect(Math.abs(after.wood - before.wood)).toBeLessThanOrEqual(Math.max(5, before.wood * 0.05));
  expect(after.used).toBe(before.used);
});
