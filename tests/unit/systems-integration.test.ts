import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('M5 systems integration', () => {
  it('startGame creates a clock, weather, research, and rally state', () => {
    const game = startGame('ancient-silver-forest');
    expect(game.clock.elapsed).toBe(0);
    expect(game.weather.state).toBe('sunny');
    expect(game.research.purchased.size).toBe(0);
    expect(game.rally.targetKey).toBe('');
  });

  it('the clock advances as the game ticks', () => {
    const game = startGame('ancient-silver-forest');
    for (let i = 0; i < 600; i++) runEconomyTick(game, 1 / 60);
    expect(game.clock.elapsed).toBeGreaterThan(9);
  });

  it('runs 7200 ticks with all M5 systems without throwing', () => {
    const game = startGame('ancient-silver-forest');
    expect(() => {
      for (let i = 0; i < 7200; i++) runEconomyTick(game, 1 / 60);
    }).not.toThrow();
  });
});
