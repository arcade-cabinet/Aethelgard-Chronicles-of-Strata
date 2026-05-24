import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * M_POLISH2.E2E.58 — save / load round-trip e2e.
 */
test('save / load preserves wood total + supply + mode', async ({ page }) => {
  await enterGame(page, 'ancient-silver-forest');
  const skip = page.locator('button', { hasText: 'Skip' });
  if (await skip.count()) await skip.first().click();
  // 600 frames = 10s game-time. Enough for peons to harvest some
  // wood (the snapshot assertion checks wood > 0); keeps CI fast.
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { advanceFrames?: (n: number) => void } };
    w.__game?.advanceFrames?.(600);
  });
  await page.waitForTimeout(300);
  type Snap = { wood: number; used: number; mode: string };
  const before: Snap = await page.evaluate(() => {
    const w = window as unknown as {
      __game?: {
        economy?: { player?: { wood?: number; usedSupply?: number } };
        mode?: string;
      };
    };
    const g = w.__game;
    return {
      wood: g?.economy?.player?.wood ?? -1,
      used: g?.economy?.player?.usedSupply ?? -1,
      mode: g?.mode ?? 'unknown',
    };
  });
  expect(before.wood).toBeGreaterThan(0);
  await page.evaluate(() => {
    const w = window as unknown as { __game?: { autoSave?: { lastSaveMs?: number } } };
    if (w.__game?.autoSave) w.__game.autoSave.lastSaveMs = -Infinity;
  });
  await page.waitForTimeout(500);
  await page.goto('/');
  await expect(page.locator('#menu-continue')).toBeEnabled({ timeout: 8000 });
  await page.locator('#menu-continue').click();
  await page.waitForTimeout(1500);
  const after: Snap = await page.evaluate(() => {
    const w = window as unknown as {
      __game?: {
        economy?: { player?: { wood?: number; usedSupply?: number } };
        mode?: string;
      };
    };
    const g = w.__game;
    return {
      wood: g?.economy?.player?.wood ?? -1,
      used: g?.economy?.player?.usedSupply ?? -1,
      mode: g?.mode ?? 'unknown',
    };
  });
  expect(after.mode).toBe(before.mode);
  expect(Math.abs(after.wood - before.wood)).toBeLessThanOrEqual(Math.max(5, before.wood * 0.05));
  expect(after.used).toBe(before.used);
});
