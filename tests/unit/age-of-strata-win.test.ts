import { describe, expect, it } from 'vitest';
import { Building, FactionTrait, HexPosition } from '@/ecs/components';
import { runEconomyTick, startGame } from '@/game/game-state';

/**
 * M_POLISH2.MODES.43a — age-of-strata Renaissance + Wonder win.
 */
describe('M_POLISH2.MODES.43a — Renaissance + Wonder win', () => {
  function setup() {
    return startGame({
      seedPhrase: 'age-strata-win-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'age-strata-win-test-ev',
      mode: 'age-of-strata',
    });
  }

  it('does NOT win when neither condition holds', () => {
    const game = setup();
    expect(game.outcome).toBe('playing');
    runEconomyTick(game, 1);
    expect(game.outcome).toBe('playing');
  });

  it('does NOT win when only Renaissance reached (no Wonder)', () => {
    const game = setup();
    game.economy.player.science = 600;
    runEconomyTick(game, 1);
    expect(game.outcome).toBe('playing');
  });

  it('does NOT win when only Wonder built (still in Stone era)', () => {
    const game = setup();
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    game.world.spawn(
      Building({ buildingType: 'Wonder', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    runEconomyTick(game, 1);
    expect(game.outcome).toBe('playing');
  });

  it('DOES win when BOTH Renaissance reached AND Wonder complete', () => {
    const game = setup();
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    game.economy.player.science = 500;
    game.world.spawn(
      Building({ buildingType: 'Wonder', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    runEconomyTick(game, 1);
    expect(game.outcome).toBe('win');
  });

  it('does NOT fire in non-age-of-strata modes', () => {
    const game = startGame({
      seedPhrase: 'border-renaissance-test',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'border-renaissance-test-ev',
      mode: 'border-clash',
    });
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    game.economy.player.science = 1000;
    game.world.spawn(
      Building({ buildingType: 'Wonder', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    runEconomyTick(game, 1);
    // The standard 300s wonder timer hasn't elapsed yet; outcome stays
    // 'playing' (the wonder timer would fire later in border-clash, but
    // NOT instantly the way the MODES.43a path does in age-of-strata).
    expect(game.outcome).toBe('playing');
  });
});
