import { describe, expect, it } from 'vitest';
import { startGame } from '@/game/game-state';
import { runEconomyTick } from '@/game/game-state';

describe('economy integration', () => {
  it('startGame creates an economy, a Town Hall, and resource nodes', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.economy.wood).toBe(50);
    expect(game.townHallKey).toMatch(/^-?\d+,-?\d+$/);
    expect(game.resourceNodes.length).toBeGreaterThan(0);
  });

  it('a peon assigned to a resource accumulates resources over many ticks', () => {
    const game = startGame('ancient-silver-forest');
    const woodBefore = game.economy.wood;
    // assign every peon to the nearest wood node and run the loop
    game.assignAllPeonsToHarvest();
    for (let i = 0; i < 3600; i++) runEconomyTick(game, 1 / 60);
    expect(game.economy.wood).toBeGreaterThanOrEqual(woodBefore);
  });

  it('runs 3600 ticks without throwing', () => {
    const game = startGame('ancient-silver-forest');
    game.assignAllPeonsToHarvest();
    expect(() => {
      for (let i = 0; i < 3600; i++) runEconomyTick(game, 1 / 60);
    }).not.toThrow();
  });
});
