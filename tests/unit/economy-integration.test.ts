import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/game-state';
import { runEconomyTick } from '@/game/game-state';

describe('economy integration', () => {
  it('startGame creates an economy, a Town Hall, and resource nodes', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.economy.player.wood).toBe(50);
    expect(game.townHallKey).toMatch(/^-?\d+,-?\d+$/);
    expect(game.resourceNodes.length).toBeGreaterThan(0);
  });

  it('a peon assigned to a resource accumulates resources over many ticks', () => {
    const game = startGame('ancient-silver-forest');
    const woodBefore = game.economy.player.wood;
    // assign every peon to the nearest wood node and run the loop
    game.assignAllPeonsToHarvest();
    for (let i = 0; i < 3600; i++) runEconomyTick(game, 1 / 60);
    // M_MICRO.6.7 — assert MEANINGFUL harvest progress; the prior
    // `>= woodBefore` would pass even if the peons harvested nothing
    // (a regression in the harvest loop). +10 leaves headroom for
    // seed variation but rejects "harvested ~0".
    expect(game.economy.player.wood).toBeGreaterThan(woodBefore + 10);
  });

  // 3600 ticks = 60 game-seconds; ~3-5s locally, occasionally over the
  // 5s default on slower CI runners (esp after the science-system + endless-
  // clamp added per-tick work). 30s headroom for CI.
  it('runs 3600 ticks without throwing', () => {
    const game = startGame('ancient-silver-forest');
    game.assignAllPeonsToHarvest();
    expect(() => {
      for (let i = 0; i < 3600; i++) runEconomyTick(game, 1 / 60);
    }).not.toThrow();
  }, 30000);
});
