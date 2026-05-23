import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('pause (M_GAMEPLAY.7)', () => {
  it('fresh game starts unpaused', () => {
    const game = startGame('pause-test');
    expect(game.paused).toBe(false);
  });

  it('paused = true freezes runEconomyTick — clock does not advance', () => {
    const game = startGame('pause-test-2');
    const before = game.clock.elapsed;
    game.paused = true;
    runEconomyTick(game, 5);
    expect(game.clock.elapsed).toBe(before);
  });

  it('unpause resumes clock advancement', () => {
    const game = startGame('pause-test-3');
    game.paused = true;
    runEconomyTick(game, 1);
    const frozen = game.clock.elapsed;
    game.paused = false;
    runEconomyTick(game, 1);
    expect(game.clock.elapsed).toBeGreaterThan(frozen);
  });
});
