import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * M_POLISH2.E2E.57 — full-match e2e per mode (6 modes).
 *
 * Each test launches the title, enters a deterministic seed for
 * that mode, advances 60s of sim, and asserts the WinConditionPill
 * shows the right copy (mode-specific) AND the game is still
 * playing (not somehow ended in the first 60s).
 *
 * This is the SMOKE coverage — it doesn't drive to victory because
 * playing-to-victory would take minutes per mode and 6 modes ×
 * 3 viewports = 18 specs at minutes each is unworkable for CI.
 * A future M_POLISH2.E2E.57a can play each mode through to its
 * win condition with the advanceFrames hook + forced state nudges.
 */
const MODES = [
  { mode: 'border-clash', copy: 'Destroy enemy base' },
  { mode: 'frontier-raid', copy: 'Survive the raids' },
  { mode: 'long-reign', copy: 'Outlast the realm' },
  { mode: 'strata-wars', copy: 'Control the realm' },
  { mode: 'age-of-strata', copy: 'Reach the final era' },
  { mode: 'coexistence', copy: 'Sandbox' },
] as const;

for (const { mode, copy } of MODES) {
  test(`per-mode smoke: ${mode}`, async ({ page }) => {
    await page.goto(`/?seed=e2e-${mode}&mode=${mode}`);
    await enterGame(page, `e2e-${mode}`);
    const skip = page.locator('button', { hasText: 'Skip' });
    if (await skip.count()) await skip.first().click();
    // Advance 60s game-time.
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
      const g = (window as any).__game;
      if (g?.advanceFrames) g.advanceFrames(3600);
    });
    await page.waitForTimeout(400);

    // WinConditionPill should show the mode-specific copy.
    await expect(page.locator('#win-condition-pill')).toContainText(copy);

    // Game must still be 'playing' after 60s; no immediate-end.
    const outcome = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: dev-console accessor
      return (window as any).__game?.outcome ?? 'unknown';
    });
    expect(outcome).toBe('playing');
  });
}
