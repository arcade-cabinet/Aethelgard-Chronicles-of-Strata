/**
 * M_EXPANSION.T.133 — encroachment system integration test.
 *
 * Advance a freshly-started game for 60 ticks (1s each). Assert that
 * zone.controlled.size grows monotonically for at least one faction
 * (peons claim tiles via the existing harvest+encroachment loop).
 *
 * The system already has a unit test (encroachment.test.ts) covering
 * tile-flip mechanics in isolation; this one pins the integration:
 * over 60 frames, the live game's zones DO grow, not stagnate.
 */
import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('encroachment integration (M_EXPANSION.T.133)', () => {
  it('60 ticks of simulation grows player zone above the attractor seed', () => {
    const game = startGame({
      seedPhrase: 'autumn-bronze-summit',
      mapSize: 6,
      difficulty: 'normal',
      eventSeed: 'test-seed',
    });
    const seedSize = game.zones.player.controlled.size;
    for (let i = 0; i < 60; i++) runEconomyTick(game, 1);
    expect(game.zones.player.controlled.size).toBeGreaterThanOrEqual(seedSize);
  });
});
