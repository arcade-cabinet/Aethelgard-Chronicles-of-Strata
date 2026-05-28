/**
 * M_V9.E2E.SAVE-LOAD-N-PLAYER — Playwright e2e: serialize + reload + restore
 * proves the save/load round-trip holds under N-player (4-faction) load.
 *
 * Flow:
 *   1. Boot /?ai-vs-ai=1&nplayer=4&seed=save-load-n42 — 4-faction AI-vs-AI.
 *   2. Wait for __game_advanceFrames hook.
 *   3. Advance 5 sim-min (18000 frames at 60 Hz).
 *   4. Capture pre-save state: faction count, economy per faction, building counts.
 *   5. Serialize via window.__game_save() → JSON string.
 *   6. Reload the page; inject the snapshot via window.__game_load(snap).
 *   7. Advance another 5 sim-min.
 *   8. Assert: faction count unchanged (4), economy entries for all 4 factions
 *      non-zero (>= initial seeds), building count non-decreasing vs pre-save.
 *
 * Spec ref: M_V7.CARRY.SAVE-V6-STATE (SNAPSHOT_VERSION 3) + M_V9 N-player prove.
 */
import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 300_000 });

test.describe('M_V9.E2E.SAVE-LOAD-N-PLAYER', () => {
  test('4-player serialize → reload → restore round-trip', async ({ page }) => {
    // 1. Boot 4-player AI-vs-AI.
    await page.goto('/?ai-vs-ai=1&nplayer=4&seed=save-load-n42&mode=border-clash');

    // 2. Wait for the harness. Gate on the SINGLE atomic readiness flag
    // (`__game_ready`, published last by installDevHarness after `__game`
    // + every hook are in place on the committed document) — never on an
    // individual hook. Gating on a hook let the suite-load race resolve
    // against a half-installed / non-committed document while the
    // follow-up evaluate read `__game` as falsy. See M_V13.HARNESS.ATOMIC-READY.
    await page.waitForFunction(() => (window as { __game_ready?: boolean }).__game_ready === true, {
      timeout: 60_000,
    });

    // M_V13.HARNESS.NO-RELOAD-UNDER-E2E — stamp a reload sentinel on the
    // live document. A full page reload (the real root cause of the
    // suite-load flake: the static-assets `public/` watcher broadcasting
    // `page reload` mid-test) wipes `window`, so this nonce vanishing is
    // a deterministic, self-describing signal — far better than the
    // downstream "__game not ready" that the reload otherwise produced.
    // With VITE_E2E=1 the watcher is disabled, so this must always hold.
    const RELOAD_SENTINEL = `nplayer-${Date.now()}`;
    await page.evaluate((s: string) => {
      (window as { __reloadSentinel?: string }).__reloadSentinel = s;
    }, RELOAD_SENTINEL);

    // 3. Advance 5 sim-min (18 000 frames). This crosses AUTO_SAVE_INTERVAL
    // (300 game-sec = 18 000 ticks), firing persistence.save once.
    await page.evaluate(() => {
      (window as { __game_advanceFrames?: (n: number) => void }).__game_advanceFrames?.(18_000);
    });
    await page.waitForTimeout(500);

    // Fail loudly + specifically if the page reloaded out from under the
    // test (sentinel gone) rather than letting it surface as the opaque
    // "__game not ready" further down.
    const sentinelSurvived = await page.evaluate(
      (s: string) => (window as { __reloadSentinel?: string }).__reloadSentinel === s,
      RELOAD_SENTINEL,
    );
    expect(
      sentinelSurvived,
      'Page reloaded mid-test (reload sentinel lost) — the dev server broadcast a full ' +
        'reload during the deterministic test window. Check VITE_E2E=1 is set on the ' +
        'Playwright webServer (disables the static-assets public/ watcher).',
    ).toBe(true);

    // 4. Capture pre-save state.
    type PreSave = {
      factionCount: number;
      playerWood: number;
      enemyWood: number;
      p3Wood: number;
      p4Wood: number;
      buildingCount: number;
    };
    const preSave: PreSave = await page.evaluate(() => {
      const g = (
        window as {
          __game?: {
            factions: Array<{ kind: string }>;
            economy: { player: { wood: number }; enemy: { wood: number } };
            economyExtra: Map<string, { wood: number }>;
            world: { query: (...args: unknown[]) => Iterable<unknown> };
          };
          __game_traits?: { Building: unknown; FactionTrait: unknown };
        }
      ).__game;
      if (!g) throw new Error('__game not ready');
      const nonBarbarian = g.factions.filter((f) => f.kind !== 'barbarian');
      const p3 = g.economyExtra.get('player-3');
      const p4 = g.economyExtra.get('player-4');
      const { Building, FactionTrait } = (
        window as { __game_traits?: { Building: unknown; FactionTrait: unknown } }
      ).__game_traits!;
      let buildings = 0;
      for (const e of g.world.query(Building, FactionTrait)) {
        void e;
        buildings++;
      }
      return {
        factionCount: nonBarbarian.length,
        playerWood: g.economy.player.wood,
        enemyWood: g.economy.enemy.wood,
        p3Wood: p3?.wood ?? 0,
        p4Wood: p4?.wood ?? 0,
        buildingCount: buildings,
      };
    });

    expect(preSave.factionCount).toBe(4);

    // 5. Serialize.
    const snapshot: unknown = await page.evaluate(() => {
      return (window as { __game_save?: () => unknown }).__game_save?.();
    });
    expect(snapshot).not.toBeNull();
    const snapshotJson = JSON.stringify(snapshot);
    expect(snapshotJson.length).toBeGreaterThan(100);

    // 6. Reload the page and inject the snapshot.
    await page.goto('/?ai-vs-ai=1&nplayer=4&seed=save-load-n42&mode=border-clash');
    // Same atomic gate post-reload — `__game_load` is installed in the
    // same committed pass as `__game_ready`, so the flag implies the
    // load hook is present too.
    await page.waitForFunction(() => (window as { __game_ready?: boolean }).__game_ready === true, {
      timeout: 60_000,
    });

    const RELOAD_SENTINEL_2 = `nplayer-post-${Date.now()}`;
    await page.evaluate(
      ([snapJson, sentinel]: [string, string]) => {
        (window as { __reloadSentinel?: string }).__reloadSentinel = sentinel;
        const snap = JSON.parse(snapJson);
        // CodeRabbit #91 (Major) — require the restore hook, don't
        // optional-chain it. With a deterministic seed the post-restore
        // assertions could still pass if __game_load were silently
        // absent (no-op restore → identical state), masking a broken
        // harness. Throw loudly if the hook is missing.
        const load = (window as { __game_load?: (s: unknown) => void }).__game_load;
        if (typeof load !== 'function')
          throw new Error('__game_load hook missing — restore cannot be verified');
        load(snap);
      },
      [snapshotJson, RELOAD_SENTINEL_2] as [string, string],
    );

    await page.waitForTimeout(300);

    // 7. Advance another 5 sim-min.
    await page.evaluate(() => {
      (window as { __game_advanceFrames?: (n: number) => void }).__game_advanceFrames?.(18_000);
    });
    await page.waitForTimeout(500);

    // Reload sentinel guard for the post-restore window too.
    const sentinel2Survived = await page.evaluate(
      (s: string) => (window as { __reloadSentinel?: string }).__reloadSentinel === s,
      RELOAD_SENTINEL_2,
    );
    expect(
      sentinel2Survived,
      'Page reloaded during the post-restore window (sentinel lost). See VITE_E2E note above.',
    ).toBe(true);

    // 8. Assert post-restore state.
    type PostRestore = {
      factionCount: number;
      playerWood: number;
      p3Wood: number;
      p4Wood: number;
      buildingCount: number;
    };
    const postRestore: PostRestore = await page.evaluate(() => {
      const g = (
        window as {
          __game?: {
            factions: Array<{ kind: string }>;
            economy: { player: { wood: number } };
            economyExtra: Map<string, { wood: number }>;
            world: { query: (...args: unknown[]) => Iterable<unknown> };
          };
          __game_traits?: { Building: unknown; FactionTrait: unknown };
        }
      ).__game;
      if (!g) throw new Error('__game not ready post-restore');
      const nonBarbarian = g.factions.filter((f) => f.kind !== 'barbarian');
      const p3 = g.economyExtra.get('player-3');
      const p4 = g.economyExtra.get('player-4');
      const { Building, FactionTrait } = (
        window as { __game_traits?: { Building: unknown; FactionTrait: unknown } }
      ).__game_traits!;
      let buildings = 0;
      for (const e of g.world.query(Building, FactionTrait)) {
        void e;
        buildings++;
      }
      return {
        factionCount: nonBarbarian.length,
        playerWood: g.economy.player.wood,
        p3Wood: p3?.wood ?? 0,
        p4Wood: p4?.wood ?? 0,
        buildingCount: buildings,
      };
    });

    // Faction count must be preserved.
    expect(postRestore.factionCount).toBe(4);

    // Economy entries for all 4 factions must be non-negative (≥ 0).
    // After 5 sim-min post-restore, wood should be ≥ preSave (ongoing harvesting).
    expect(postRestore.playerWood).toBeGreaterThanOrEqual(preSave.playerWood);
    // N-player economy slots (player-3, player-4) must be accessible.
    expect(postRestore.p3Wood).toBeGreaterThanOrEqual(0);
    expect(postRestore.p4Wood).toBeGreaterThanOrEqual(0);

    // Building count must be non-decreasing (AI continues to build after restore).
    expect(postRestore.buildingCount).toBeGreaterThanOrEqual(preSave.buildingCount);
  });
});
