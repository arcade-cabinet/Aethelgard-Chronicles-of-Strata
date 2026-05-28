import { expect, test } from '@playwright/test';
import { enterGame } from './enter-game';

/**
 * M_POLISH2.E2E.58 — save / load round-trip e2e via the Continue button.
 *
 * Companion to save-load-n-player.spec.ts (which round-trips via
 * window.__game_save/__game_load directly). This one exercises the
 * REAL user flow: play a bit → autosave commits → reload page →
 * title-screen Continue button enables → click Continue → restored
 * game shows the same economy state.
 *
 * Originally skipped because the title screen's hasSave flag updated
 * only on cold mount (cached). M_POLISH3.S.3 added the
 * `aethelgard:save-committed` window event + a `__refreshSaveList()`
 * test hook, so the test no longer depends on cache-bust timing.
 */
test('save / load preserves wood total + supply + mode', async ({ page }) => {
  await enterGame(page, 'ancient-silver-forest');
  const skip = page.locator('button', { hasText: 'Skip' });
  if (await skip.count()) await skip.first().click();
  // 600 frames = 10s game-time. Enough for peons to harvest some
  // wood (the snapshot assertion checks wood > 0); keeps CI fast.
  await page.evaluate(() => {
    const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
    w.__game_advanceFrames?.(600);
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
  // Force an immediate autosave by invoking the autosave's onSave
  // callback directly (which persists + dispatches the
  // 'aethelgard:save-committed' window event). AutoSave.elapsed-based
  // gating means we can't just bump a field — we have to actually
  // fire the save.
  await page.evaluate(async () => {
    const w = window as unknown as {
      __game?: { autoSave?: { onSave: () => Promise<void> | void } };
    };
    if (w.__game?.autoSave) await w.__game.autoSave.onSave();
  });
  // Wait for the save-committed event to round-trip through the listener
  // (persistence.list resolves async; the listener then setHasSave's true).
  await page.waitForTimeout(500);
  await page.goto('/');
  await expect(page.locator('#menu-continue')).toBeEnabled({ timeout: 8000 });
  await page.locator('#menu-continue').click();
  // Wait for GameSession to mount + the dev-harness to install __game.
  await page.waitForFunction(() => typeof (window as { __game?: unknown }).__game === 'object', {
    timeout: 60_000,
  });
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
