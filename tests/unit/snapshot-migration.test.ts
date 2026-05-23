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
    expect(snap.version).toBe(1);
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
    // Synthesise a v0 snapshot — older than SNAPSHOT_VERSION=1 and no
    // migration registered for v0. This is the failure mode that
    // SNAPSHOT_MIGRATIONS must address before any schema bump ships.
    const original = startGame('autumn-bronze-summit');
    const snap = serializeGame(original);
    snap.version = 0 as never;
    expect(() => deserializeGame(JSON.parse(JSON.stringify(snap)))).toThrow(/no migration/);
  });
});
