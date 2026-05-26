/**
 * M_EXPANSION.S.61 — schema-migration fixture.
 *
 * Today SNAPSHOT_MIGRATIONS is empty (we're at SNAPSHOT_VERSION=1 and
 * no version-bump has shipped). This test pins two contracts:
 *
 *   1. A v1 snapshot deserializes WITHOUT going through any migration
 *      (the migration loop should be a no-op when current === target).
 *   2. A snapshot at an UNKNOWN version (v9999) — past current — throws
 *      with the documented error message instead of silently corrupting.
 *
 * When the FIRST migration lands (v1→v2), this test extends with an
 * explicit fixture: a literal v1 snapshot JSON in /tests/fixtures/
 * deserializes to the expected v2 shape. That extension is the
 * milestone-gate for any schema bump.
 */
import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/game-state';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';

describe('snapshot migration framework (M_EXPANSION.S.61)', () => {
  it('a current-version snapshot passes through the migration loop as a no-op', () => {
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    // version pinned by serialize at SNAPSHOT_VERSION; migration walks
    // until current.version === SNAPSHOT_VERSION (zero iterations).
    // SNAPSHOT_VERSION bumped to 3 in M_V7.CARRY.SAVE-V6-STATE — added
    // diplomacy / mythEvents / cooldowns / victoryRecord blocks to
    // GameSnapshot. (v1→v2 was M_FUN.DYN.FIX.SAVE-GAP for terrain.)
    expect(snap.version).toBe(3);
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    expect(restored.seedPhrase).toBe('autumn-bronze-summit');
  });

  it('an unknown future version throws with the documented message', () => {
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    snap.version = 9999 as never;
    expect(() => deserializeGame(JSON.parse(JSON.stringify(snap)))).toThrow(
      /snapshot version 9999/,
    );
  });

  it('a stale-version snapshot with NO migration throws (catch the gap before it ships)', () => {
    // Synthesise a v0 snapshot — older than SNAPSHOT_VERSION=2 and no
    // migration registered for v0. This is the failure mode that
    // SNAPSHOT_MIGRATIONS must address before any schema bump ships.
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    snap.version = 0 as never;
    expect(() => deserializeGame(JSON.parse(JSON.stringify(snap)))).toThrow(/no migration/);
  });

  it('v1 → v2 migration loads cleanly with default dynamic-terrain state', () => {
    // Synthesise a v1 snapshot (pre-M_FUN.DYN) — the wildfires +
    // quakeShakeRemaining + volcano fields don't exist. Migration
    // should fill them with safe defaults so the game resumes
    // without bricking.
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    snap.version = 1 as never;
    // Drop the new fields a v1 save wouldn't have had.
    const synthetic = snap as unknown as Record<string, unknown>;
    // biome-ignore lint/performance/noDelete: test-only mutation of synthetic snapshot
    delete synthetic.wildfires;
    delete synthetic.quakeShakeRemaining;
    delete synthetic.volcano;
    // v1 also predates v0.6 substrate — drop those too so the
    // v1 → v2 → v3 chain migration is exercised end-to-end.
    delete synthetic.diplomacy;
    delete synthetic.diplomacyProposals;
    delete synthetic.tradeCooldowns;
    delete synthetic.mythEvents;
    delete synthetic.victoryRecord;
    delete synthetic.portalStoneCooldowns;
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    expect(restored.wildfires.size).toBe(0);
    expect(restored.quakeShakeRemaining).toBe(0);
    // volcano placement is deterministic from the seed, so it may or
    // may not have a position; the only contract is that it's defined.
    expect(restored.volcano).toBeDefined();
    // v0.6 substrate also restored to empty defaults.
    expect(restored.diplomacy.relations.size).toBe(0);
    expect(restored.diplomacyProposals.pending).toEqual([]);
    expect(restored.tradeCooldowns.cooldowns.size).toBe(0);
    expect(restored.mythEvents.lastFireSeconds).toBe(-1);
    expect(restored.mythEvents.active).toBeNull();
    // M_V11.PURGE — victoryRecord field gone (was 4X-only).
    expect(restored.portalStoneCooldowns.size).toBe(0);
  });

  it('v2 → v3 migration loads a pre-v0.6 save with empty v0.6 substrate state', () => {
    // M_V7.CARRY.SAVE-V6-STATE — a v2 save predates v0.6 entirely.
    // Migration leaves the new fields undefined; deserializeGame uses
    // the fresh-from-startGame createDiplomacyState() / createMythEventsState()
    // / new Map() defaults.
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    snap.version = 2 as never;
    const synthetic = snap as unknown as Record<string, unknown>;
    // biome-ignore lint/performance/noDelete: test-only mutation of synthetic snapshot
    delete synthetic.diplomacy;
    delete synthetic.diplomacyProposals;
    delete synthetic.tradeCooldowns;
    delete synthetic.mythEvents;
    delete synthetic.victoryRecord;
    delete synthetic.portalStoneCooldowns;
    const restored = deserializeGame(JSON.parse(JSON.stringify(snap)));
    expect(restored.diplomacy.relations.size).toBe(0);
    expect(restored.diplomacyProposals.pending).toEqual([]);
    expect(restored.tradeCooldowns.cooldowns.size).toBe(0);
    expect(restored.mythEvents.lastFireSeconds).toBe(-1);
    expect(restored.mythEvents.active).toBeNull();
    // M_V11.PURGE — victoryRecord field gone (was 4X-only).
    expect(restored.portalStoneCooldowns.size).toBe(0);
  });
});
