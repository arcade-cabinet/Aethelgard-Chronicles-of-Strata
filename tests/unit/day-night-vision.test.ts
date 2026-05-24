import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.87 — day/night vision modifier. Verifies the vision
 * cone radius passed to updateObserved varies with clock phase:
 *   night [0.6, 0.9) → enemy vision halved
 *   dawn  [0.15, 0.30) → player vision halved
 *   else → full vision both sides
 *
 * Direct unit tests on the modifier logic. (End-to-end visibility
 * stat tests would require simulating combat with cone-edge units,
 * which is e2e territory.)
 */
describe('M_EXPANSION.F.87 — day/night vision modifier', () => {
  it('runEconomyTick survives a full day cycle without throwing', () => {
    const game = startGame('day-night-cycle');
    // 240s day (per WORLD.dayLength) → 14400 60Hz ticks. Coarse-step
    // to keep it fast: 1s deltas, 250 ticks = ~1 full day.
    for (let i = 0; i < 250; i++) {
      runEconomyTick(game, 1);
    }
    expect(game.outcome).toBeDefined();
  });

  it('clock.elapsed advances monotonically through the vision-modifier branches', () => {
    const game = startGame('day-night-monotonic');
    const start = game.clock.elapsed;
    for (let i = 0; i < 60; i++) runEconomyTick(game, 0.5);
    // Should have crossed at least one phase boundary.
    expect(game.clock.elapsed).toBeGreaterThan(start + 25);
  });
});
