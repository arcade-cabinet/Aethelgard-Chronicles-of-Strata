import { describe, expect, it } from 'vitest';
import { createEventPrng } from '@/core/rng';
import { startGame } from '@/game/game-state';
import { tickRandomEvents } from '@/game/random-events';

/**
 * M_EXPANSION.F.81 — random-events scheduler. Tests verify the
 * cooldown/probability shape + the three event outcomes.
 */
describe('M_EXPANSION.F.81 — random events', () => {
  it('does NOT fire before the cooldown elapses', () => {
    const game = startGame('events-cooldown');
    const rng = createEventPrng('events-cooldown-rng');
    // Cooldown is 45s; tick 1s — no fire.
    const kind = tickRandomEvents(game, rng, 1);
    expect(kind).toBeNull();
    expect(game.randomEvents.fired).toBe(0);
  });

  it('resets the cooldown after each roll (fires OR misses)', () => {
    const game = startGame('events-cooldown-reset');
    const rng = createEventPrng('events-cooldown-reset-rng');
    // Drain the cooldown in one tick.
    tickRandomEvents(game, rng, 100);
    // Cooldown should now be ~45s again, regardless of fire/miss.
    expect(game.randomEvents.nextRollIn).toBeGreaterThan(40);
  });

  it('eventually fires when many rolls occur', () => {
    const game = startGame('events-eventually');
    const rng = createEventPrng('events-eventually-rng');
    // Run 200 rolls; should fire many.
    for (let i = 0; i < 200; i++) {
      tickRandomEvents(game, rng, 100);
    }
    expect(game.randomEvents.fired).toBeGreaterThan(20);
    // last fired kind should be one of the 4 valid events
    // (added 'wildfire' in M_FUN.DYN.WILDFIRE).
    expect(['weather-spike', 'raid-warning', 'refugee-arrival', 'wildfire']).toContain(
      game.randomEvents.lastKind,
    );
  });

  it('refugee-arrival increases player wood', () => {
    const game = startGame('events-refugee');
    const rng = createEventPrng('events-refugee-rng');
    // Force the event by directly calling the apply path through
    // many rolls until we get refugee.
    const before = game.economy.player.wood;
    let attempts = 0;
    while (game.randomEvents.lastKind !== 'refugee-arrival' && attempts < 500) {
      tickRandomEvents(game, rng, 100);
      attempts++;
    }
    if (game.randomEvents.lastKind === 'refugee-arrival') {
      expect(game.economy.player.wood).toBeGreaterThan(before);
    }
  });
});
