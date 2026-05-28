import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';

/**
 * M_POLISH3.J.4 — selection state captures.
 *
 * Five SelectionPanel HUD states (nothing / peon / military / building
 * / multi). Driven via the __game_findPlayerEntities + __game.selectedId
 * test hooks rather than canvas click ray-picking (which depends on
 * camera+viewport and is flaky in headless).
 *
 * Runs only on demand:
 *   pnpm test:e2e tests/e2e/selection-journey.spec.ts
 */
const OUT_DIR = 'artifacts/journey/selection';

test('selection state captures', async ({ page }) => {
  test.setTimeout(60_000);
  mkdirSync(OUT_DIR, { recursive: true });

  await page.goto('/?ai-vs-ai=1&seed=selection-seed&mode=border-clash');
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __game_advanceFrames?: unknown }).__game_advanceFrames ===
      'function',
    { timeout: 60_000 },
  );
  await page.evaluate(async () => {
    const w = window as unknown as { __skipOnboarding?: () => Promise<void> };
    await w.__skipOnboarding?.();
  });
  await page
    .waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5_000 })
    .catch(() => undefined);
  // advance to 90s so Barracks + military units exist
  await page.evaluate(() => {
    const w = window as unknown as { __game_advanceFrames?: (n: number) => void };
    w.__game_advanceFrames?.(5400);
  });
  await page.waitForTimeout(400);

  // 1. no selection
  await page.evaluate(() => {
    interface G {
      selectedId?: number | undefined;
      selectedIds: number[];
    }
    const w = window as unknown as { __game?: G };
    if (w.__game) {
      delete w.__game.selectedId;
      w.__game.selectedIds = [];
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT_DIR, 'none.png'), fullPage: false });

  const selectAndSnap = async (
    slug: string,
    kind: 'peon' | 'military' | 'building',
  ): Promise<number> => {
    const count = await page.evaluate(
      ({ k }) => {
        interface G {
          selectedId?: number | undefined;
          selectedIds: number[];
        }
        const w = window as unknown as {
          __game?: G;
          __game_findPlayerEntities?: (k: 'peon' | 'military' | 'building') => number[];
        };
        const ids = w.__game_findPlayerEntities?.(k) ?? [];
        const g = w.__game;
        if (!g) return 0;
        if (ids.length === 0) {
          delete g.selectedId;
          g.selectedIds = [];
          return 0;
        }
        g.selectedId = ids[0];
        g.selectedIds = [ids[0]!];
        return ids.length;
      },
      { k: kind },
    );
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT_DIR, `${slug}.png`), fullPage: false });
    return count;
  };

  const peonN = await selectAndSnap('peon', 'peon');
  console.log(`[selection] peon found: ${peonN}`);
  const milN = await selectAndSnap('military', 'military');
  console.log(`[selection] military found: ${milN}`);
  const buildingN = await selectAndSnap('building', 'building');
  console.log(`[selection] building found: ${buildingN}`);

  // multi (select all peons up to 4)
  const multiN = await page.evaluate(() => {
    interface G {
      selectedId?: number | undefined;
      selectedIds: number[];
    }
    const w = window as unknown as {
      __game?: G;
      __game_findPlayerEntities?: (k: 'peon' | 'military' | 'building') => number[];
    };
    const ids = w.__game_findPlayerEntities?.('peon') ?? [];
    const g = w.__game;
    if (!g || ids.length === 0) return 0;
    g.selectedId = ids[0];
    g.selectedIds = ids;
    return ids.length;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT_DIR, 'multi.png'), fullPage: false });
  console.log(`[selection] multi selected: ${multiN}`);
});
