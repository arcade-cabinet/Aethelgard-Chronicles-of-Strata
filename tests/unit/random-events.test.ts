import { describe, expect, it } from 'vitest';
import { createEventPrng } from '@/core/rng';
import { startGame } from '@/game/game-state';
import { tickRandomEvents } from '@/game/random-events';

/**
 * M_V11.EVENTS.RTS-TRIGGERED — random-events scheduler is now
 * trigger-driven, not probabilistic. Tests assert the contract:
 *
 *   1. Grace period — no events at all in the first 60s of a fresh
 *      game (narrative: a fresh realm has nothing to react to).
 *   2. After the grace period, an event only fires if a domain
 *      trigger is satisfied; a fresh game with no enemy pressure / no
 *      drought / no volcano / no peon loss stays silent.
 *   3. The cooldown resets only on FIRE; a no-trigger tick re-checks
 *      cheaply (5s) rather than waiting the full 45s.
 */
describe('M_V11.EVENTS.RTS-TRIGGERED — trigger-driven events', () => {
  it('does NOT fire in the first 60s (grace period)', () => {
    const game = startGame('events-grace');
    const rng = createEventPrng('events-grace-rng');
    // game.clock.elapsed is 0 — well inside the 60s grace window.
    for (let i = 0; i < 30; i++) {
      const kind = tickRandomEvents(game, rng, 1);
      expect(kind).toBeNull();
    }
    expect(game.randomEvents.fired).toBe(0);
  });

  it('after grace period, fresh game with no triggers stays silent', () => {
    const game = startGame('events-no-triggers');
    const rng = createEventPrng('events-no-triggers-rng');
    // Fast-forward past the grace period.
    game.clock.elapsed = 120;
    // Drain the cooldown so the next tick evaluates triggers.
    game.randomEvents.nextRollIn = 0;
    // No enemy military near player, no drought, no volcano lava,
    // no peon loss — every trigger predicate is false. Expect null.
    for (let i = 0; i < 10; i++) {
      const kind = tickRandomEvents(game, rng, 1);
      expect(kind).toBeNull();
    }
    expect(game.randomEvents.fired).toBe(0);
  });

  it('no-trigger tick resets nextRollIn to a short recheck (5s), not the full cooldown', () => {
    const game = startGame('events-recheck');
    const rng = createEventPrng('events-recheck-rng');
    game.clock.elapsed = 120;
    game.randomEvents.nextRollIn = 0;
    tickRandomEvents(game, rng, 1);
    // No trigger fired — recheck should be short (≤10s) so we poll
    // cheaply rather than wait the full cooldown for nothing.
    expect(game.randomEvents.nextRollIn).toBeLessThanOrEqual(10);
  });
});
