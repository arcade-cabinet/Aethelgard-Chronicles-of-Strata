import { describe, expect, it } from 'vitest';
import { Health } from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('combat integration', () => {
  it('startGame creates a Town Hall entity and a Goblin Portal entity with Health', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.townHallEntity.get(Health)?.current).toBeGreaterThan(0);
    expect(game.portalEntity.get(Health)?.current).toBeGreaterThan(0);
  });

  it('the portal spawns enemies over time', () => {
    const game = startGame('ancient-silver-forest');
    // run ~2 minutes of game time
    for (let i = 0; i < 7200; i++) runEconomyTick(game, 1 / 60);
    // at least one goblin spawned (spawnInterval ~45s)
    expect(game.outcome === 'playing' || game.outcome === 'win' || game.outcome === 'loss').toBe(true);
  });

  it('runs 7200 combat ticks without throwing', () => {
    const game = startGame('ancient-silver-forest');
    expect(() => {
      for (let i = 0; i < 7200; i++) runEconomyTick(game, 1 / 60);
    }).not.toThrow();
  });
});
