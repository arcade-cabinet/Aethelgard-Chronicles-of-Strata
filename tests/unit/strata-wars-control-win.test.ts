import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_POLISH2.MODES.42a — strata-wars 80%-zone-for-30s win condition.
 *
 * Pin the timer behavior directly by mutating zones.player.controlled
 * + zones.enemy.controlled then ticking the loop. We synthesise the
 * 80%/20% split rather than playing out an actual conquest, because
 * the timer math is what we're testing — not the AI's ability to
 * reach 80% from a fresh start.
 */
describe('M_POLISH2.MODES.42a — strata-wars control timer', () => {
  function setup() {
    return startGame({
      seedPhrase: 'strata-control-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'strata-control-test-ev',
      mode: 'strata-wars',
    });
  }

  function force8020(game: ReturnType<typeof setup>) {
    game.zones.player.controlled.clear();
    game.zones.enemy.controlled.clear();
    for (let i = 0; i < 80; i++) game.zones.player.controlled.add(`p-${i}`);
    for (let i = 0; i < 20; i++) game.zones.enemy.controlled.add(`e-${i}`);
  }

  it('initial timer is 0', () => {
    const game = setup();
    expect(game.strataWarsControlTimer).toBe(0);
  });

  it('timer advances when player ≥ 80% control', () => {
    const game = setup();
    force8020(game);
    runEconomyTick(game, 5);
    expect(game.strataWarsControlTimer).toBeGreaterThanOrEqual(5);
  });

  it('timer resets to 0 when player drops below 80%', () => {
    const game = setup();
    force8020(game);
    runEconomyTick(game, 10);
    expect(game.strataWarsControlTimer).toBeGreaterThan(0);
    // Drop player to 50% by adding enemy tiles
    for (let i = 20; i < 80; i++) game.zones.enemy.controlled.add(`e-${i}`);
    runEconomyTick(game, 1);
    expect(game.strataWarsControlTimer).toBe(0);
  });

  it('timer reaching 30 flips outcome to "win"', () => {
    const game = setup();
    force8020(game);
    // 30 game-seconds of sustained 80%+ control
    runEconomyTick(game, 30);
    expect(game.outcome).toBe('win');
  });

  it('does NOT tick in non-strata-wars modes', () => {
    const game = startGame({
      seedPhrase: 'border-control-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'border-control-test-ev',
      mode: 'border-clash',
    });
    game.zones.player.controlled.clear();
    game.zones.enemy.controlled.clear();
    for (let i = 0; i < 90; i++) game.zones.player.controlled.add(`p-${i}`);
    for (let i = 0; i < 10; i++) game.zones.enemy.controlled.add(`e-${i}`);
    runEconomyTick(game, 30);
    expect(game.strataWarsControlTimer).toBe(0);
    // outcome shouldn't be 'win' from THIS mechanism (it may still
    // be 'win' from other means, but not the strata-wars control
    // timer specifically — at this mapSize/difficulty, no win path
    // resolves in 30 simulated seconds).
    expect(game.outcome).toBe('playing');
  });
});
