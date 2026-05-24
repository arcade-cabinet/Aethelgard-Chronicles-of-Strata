import { describe, expect, it } from 'vitest';
import { endTurn } from '@/game/commands';
import { runEconomyTick, startGame } from '@/game/game-state';

describe('turn-based mode (M_MODES.8)', () => {
  it('4x preset initialises game.turn (turnsMode: turn-based)', () => {
    const game = startGame({
      seedPhrase: 'turn-4x',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'turn-events',
      mode: 'age-of-strata',
    });
    expect(game.turn).toBeDefined();
    expect(game.turn?.active).toBe('player');
    expect(game.turn?.turnLength).toBe(60);
  });

  it('non-turn-based modes have no game.turn', () => {
    const game = startGame({
      seedPhrase: 'turn-rvb',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'turn-events-2',
      mode: 'border-clash',
    });
    expect(game.turn).toBeUndefined();
  });

  it('turn budget decrements + auto-flips at 0', () => {
    const game = startGame({
      seedPhrase: 'turn-4x-2',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'turn-events-3',
      mode: 'age-of-strata',
    });
    expect(game.turn?.active).toBe('player');
    // drain 61 seconds of game time — turn should have flipped at 60
    for (let i = 0; i < 61 * 60; i++) runEconomyTick(game, 1 / 60);
    expect(game.turn?.active).toBe('enemy');
    expect(game.turn?.secondsRemaining).toBeLessThanOrEqual(60);
  });

  it('endTurn() flips the active faction + resets the budget', () => {
    const game = startGame({
      seedPhrase: 'turn-4x-3',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'turn-events-4',
      mode: 'age-of-strata',
    });
    expect(game.turn?.active).toBe('player');
    endTurn(game);
    expect(game.turn?.active).toBe('enemy');
    expect(game.turn?.secondsRemaining).toBe(60);
  });

  it('endTurn is a no-op for non-turn-based games', () => {
    const game = startGame({
      seedPhrase: 'turn-noop',
      mapSize: 18,
      difficulty: 'normal',
      eventSeed: 'turn-events-5',
      mode: 'border-clash',
    });
    endTurn(game);
    expect(game.turn).toBeUndefined();
  });
});
