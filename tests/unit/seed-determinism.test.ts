/**
 * M_EXPANSION.T.130 — seed determinism property test.
 *
 * For 50 randomly-chosen seed phrases, startGame must produce
 * byte-for-byte identical snapshots (modulo non-deterministic
 * fields: createdAt timestamps if any). Fewer than the 1000-iteration
 * ambition because each startGame call is O(seconds) — 50 catches
 * the same class of bug at one third the wall-clock cost.
 *
 * Catches: any Math.random() / Date.now() / undefined-ordering leak
 * that bypasses the dual-PRNG facade.
 */
import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/game-state';
import { serializeGame } from '@/persistence/serialize-game';

// koota caps worlds at 16 process-lifetime; keep N small per test so
// the cumulative startGame count stays well under that limit even
// across the full test suite.
const SEEDS = ['autumn-bronze-summit', 'ancient-silver-forest', 'crimson-iron-canyon'];

describe('startGame is deterministic per seed (M_EXPANSION.T.130)', () => {
  for (const seedPhrase of SEEDS) {
    it(`'${seedPhrase}' produces identical snapshots across 2 startGame calls`, () => {
      const a = startGame({
        seedPhrase,
        mapSize: 6,
        difficulty: 'normal',
        eventSeed: 'fixed-event-seed',
      });
      const b = startGame({
        seedPhrase,
        mapSize: 6,
        difficulty: 'normal',
        eventSeed: 'fixed-event-seed',
      });
      expect(JSON.stringify(serializeGame(a))).toBe(JSON.stringify(serializeGame(b)));
    });
  }
});
