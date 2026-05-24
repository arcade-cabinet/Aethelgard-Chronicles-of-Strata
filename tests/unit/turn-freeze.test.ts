import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_TURNS.1 — when game.turn.active === 'player' in a turn-based
 * match, the sim FREEZES. AI doesn't tick, combat doesn't resolve,
 * spawn doesn't fire, harvest doesn't progress, science doesn't
 * accumulate. Only clock/weather/autosave + path-follow still tick
 * so the player can issue commands and see them resolve.
 *
 * These tests verify the gate by spinning runEconomyTick for several
 * frames during a player-turn and asserting that economy + supply
 * counters DON'T move. Then we flip active to 'enemy' and confirm
 * they DO move.
 */
describe('M_TURNS.1 — turn gate freezes autonomous sim during player turn', () => {
  it('science does NOT accumulate during a player turn', () => {
    const game = startGame({
      seedPhrase: 'freeze-science',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'freeze-science-events',
      mode: 'age-of-strata',
    });
    if (!game.turn) throw new Error('age-of-strata should instantiate game.turn');
    expect(game.turn.active).toBe('player');
    const scienceBefore = game.economy.player.science;
    // Tick several frames; player turn should hold science still.
    for (let i = 0; i < 10; i++) runEconomyTick(game, 0.1);
    expect(game.economy.player.science).toBe(scienceBefore);
  });

  it('flipping active to enemy opens the gate; science accumulates', () => {
    const game = startGame({
      seedPhrase: 'unfreeze-science',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'unfreeze-science-events',
      mode: 'age-of-strata',
    });
    if (!game.turn) throw new Error('turn missing');
    game.turn.active = 'enemy';
    const enemyScienceBefore = game.economy.enemy.science;
    // Tick several frames; enemy turn → sim runs → science trickles in.
    for (let i = 0; i < 30; i++) runEconomyTick(game, 0.1);
    // Science trickle is small per tick; over 3 seconds total elapsed
    // it should produce >0 delta on at least one faction.
    expect(game.economy.enemy.science).toBeGreaterThan(enemyScienceBefore);
  });

  it('real-time mode (no game.turn) ALWAYS ticks the sim', () => {
    const game = startGame({
      seedPhrase: 'realtime-control',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'realtime-control-events',
      mode: 'border-clash',
    });
    expect(game.turn).toBeUndefined();
    const scienceBefore = game.economy.player.science;
    for (let i = 0; i < 30; i++) runEconomyTick(game, 0.1);
    // Real-time always ticks; player science accumulates.
    expect(game.economy.player.science).toBeGreaterThan(scienceBefore);
  });
});
