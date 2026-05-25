/**
 * M_FUN.FOUNDATION.REPLAY-DETERMINISM — replay determinism gate.
 *
 * Two startGame(seedPhrase) calls + identical runEconomyTick(delta)
 * sequences MUST produce identical observable state. If they
 * drift, something snuck Math.random() or Date.now() into a sim
 * path (PRNG-AUDIT / CLOCK-AUDIT catch the symptom; this test
 * catches the BEHAVIOUR).
 *
 * Property-style: 5 random seed phrases × 60 sim-seconds each.
 * Asserts:
 *   - elapsed clock matches
 *   - per-faction economy snapshots match
 *   - outcome matches
 *   - lastDamageEvents count matches (combat tick is deterministic
 *     if PRNG is)
 */
import fc from 'fast-check';
import { describe, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

function takeSnapshot(g: ReturnType<typeof startGame>) {
  return {
    elapsed: Math.round(g.clock.elapsed * 1000) / 1000,
    outcome: g.outcome,
    wood: { player: g.economy.player.wood, enemy: g.economy.enemy.wood },
    kills: { player: g.economy.player.kills, enemy: g.economy.enemy.kills },
    damageCount: g.lastDamageEvents.length,
  };
}

describe('replay determinism (M_FUN.FOUNDATION.REPLAY-DETERMINISM)', () => {
  // 30s — fast-check shrinks property-based runs over a multi-faction
  // sim; CI runner is 2-3× slower than local M-series. Default 5s
  // tripped a flaky timeout post-v0.7 cycle merge. 30s gives 6× over
  // worst observed without masking a real perf regression. v0.8 adds
  // a 6th yuka evaluator (DiplomaticEvaluator) per AiPlayer — same budget.
  it('same (seedPhrase, tick sequence) produces same observable state', { timeout: 30_000 }, () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 24 }).filter((s) => s.length > 0),
        (seedPhrase) => {
          const a = startGame(seedPhrase);
          const b = startGame(seedPhrase);
          // Run the same 60 sim-seconds in 0.5s chunks (120 ticks).
          for (let i = 0; i < 120; i++) {
            runEconomyTick(a, 0.5);
            runEconomyTick(b, 0.5);
          }
          const sa = takeSnapshot(a);
          const sb = takeSnapshot(b);
          return (
            sa.elapsed === sb.elapsed &&
            sa.outcome === sb.outcome &&
            sa.wood.player === sb.wood.player &&
            sa.wood.enemy === sb.wood.enemy &&
            sa.kills.player === sb.kills.player &&
            sa.kills.enemy === sb.kills.enemy &&
            sa.damageCount === sb.damageCount
          );
        },
      ),
      { numRuns: 5 },
    );
  });
});
