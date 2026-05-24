import { describe, expect, it } from 'vitest';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_TURNS.2 — when game.turn.maxTurns fires, the runtime computes a
 * winner from (score + zoneControl × 10) per faction and flips
 * game.outcome. Tie → 'draw'. These tests exercise the cap-flip path
 * without running a full match; we synthesize the maxTurns boundary
 * directly on game.turn after startGame to keep the test fast.
 */
describe('M_TURNS.2 — turn cap victory', () => {
  it('flips to win when player has more zone-controlled tiles at the cap', () => {
    const game = startGame({
      seedPhrase: 'turn-cap-win',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'turn-cap-win-events',
      mode: 'age-of-strata',
      maxTurns: 2,
    });
    expect(game.turn).toBeDefined();
    if (!game.turn) throw new Error('turn missing — age-of-strata should instantiate it');
    // M_FUN.MAP — seedZonesFromAttractors gives the enemy ~7 tiles
    // (radius-2 hex) at start; for the win-branch assertion we need
    // player.controlled.size > enemy.controlled.size. Clear both,
    // then stack the deck for player explicitly.
    game.zones.player.controlled.clear();
    game.zones.enemy.controlled.clear();
    for (let q = 0; q <= 5; q++) game.zones.player.controlled.add(`${q},0`);
    game.zones.enemy.controlled.add('8,0');
    // Drive the turn timer to 0 twice to trigger the cap.
    game.turn.secondsRemaining = 0.01;
    runEconomyTick(game, 1);
    game.turn.secondsRemaining = 0.01;
    runEconomyTick(game, 1);
    expect(game.turn.turnsElapsed).toBeGreaterThanOrEqual(2);
    expect(game.outcome).toBe('win');
  });

  it('flips to loss when enemy has more zone-controlled tiles at the cap', () => {
    const game = startGame({
      seedPhrase: 'turn-cap-loss',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'turn-cap-loss-events',
      mode: 'age-of-strata',
      maxTurns: 2,
    });
    if (!game.turn) throw new Error('turn missing');
    // M_FUN.MAP — seedZonesFromAttractors gives both factions a
    // RADIUS=2 starting hex, so player.controlled.size and
    // enemy.controlled.size both begin at ~7. Tilt the balance by
    // removing player's seed entirely + adding extra enemy tiles
    // so the turn-cap victor check fires the LOSS branch
    // deterministically regardless of seed asymmetry from the new
    // mountain-massif pass.
    game.zones.player.controlled.clear();
    game.zones.player.controlled.add('0,0');
    game.zones.enemy.controlled.clear();
    for (let q = 3; q <= 8; q++) game.zones.enemy.controlled.add(`${q},0`);
    game.turn.secondsRemaining = 0.01;
    runEconomyTick(game, 1);
    game.turn.secondsRemaining = 0.01;
    runEconomyTick(game, 1);
    expect(game.outcome).toBe('loss');
  });

  it('flips to draw when scores tie at the cap', () => {
    const game = startGame({
      seedPhrase: 'turn-cap-draw',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'turn-cap-draw-events',
      mode: 'age-of-strata',
      maxTurns: 2,
    });
    if (!game.turn) throw new Error('turn missing');
    // Drive one turn handoff first so any sim-tick churn lands before
    // we pin the scoring inputs.
    game.turn.secondsRemaining = 0.01;
    runEconomyTick(game, 1);
    // Force exactly equal zone count + equal base score immediately
    // before the cap-triggering tick. game.score may exist on either
    // faction; we equalize on whatever runEconomyTick produced.
    game.zones.player.controlled.clear();
    game.zones.enemy.controlled.clear();
    game.zones.player.controlled.add('0,0');
    game.zones.enemy.controlled.add('5,0');
    if (game.score) {
      game.score.player = 0;
      game.score.enemy = 0;
    }
    game.turn.secondsRemaining = 0.01;
    runEconomyTick(game, 1);
    expect(game.outcome).toBe('draw');
  });

  it('uncapped (maxTurns=null) NEVER triggers a turn-cap win', () => {
    const game = startGame({
      seedPhrase: 'turn-uncapped',
      mapSize: 10,
      difficulty: 'normal',
      eventSeed: 'turn-uncapped-events',
      mode: 'age-of-strata',
      maxTurns: null, // explicit override
    });
    if (!game.turn) throw new Error('turn missing');
    expect(game.turn.maxTurns).toBeNull();
    game.zones.player.controlled.add('0,0');
    // Spin a bunch of turns; outcome must stay 'playing'.
    for (let i = 0; i < 8; i++) {
      game.turn.secondsRemaining = 0.01;
      runEconomyTick(game, 1);
    }
    expect(game.outcome).toBe('playing');
  });
});
