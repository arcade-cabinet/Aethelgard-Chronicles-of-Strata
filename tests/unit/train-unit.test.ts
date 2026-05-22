import { describe, expect, it } from 'vitest';
import { FactionTrait, Unit } from '@/ecs/components';
import { trainUnit } from '@/game/commands';
import { startGame } from '@/game/game-state';

const SEED = 'train-unit-test';

/** Count this faction's units of a role in `game`. */
function unitsOf(
  game: ReturnType<typeof startGame>,
  role: 'Peon' | 'Footman',
  faction: 'player' | 'enemy',
) {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(Unit)?.unitType === role && e.get(FactionTrait)?.faction === faction) n += 1;
  }
  return n;
}

describe('trainUnit command (M_GAMEPLAY.1)', () => {
  it('trains a Peon for the player when resources + cap + supply allow', () => {
    const game = startGame(SEED);
    game.economy.player.wood = 9999;
    game.economy.player.maxSupply = 50;
    const before = unitsOf(game, 'Peon', 'player');
    const ok = trainUnit(game, 'Peon', 'player');
    expect(ok).toBe(true);
    expect(unitsOf(game, 'Peon', 'player')).toBe(before + 1);
  });

  it('refuses to train when the player cannot afford the cost', () => {
    const game = startGame(SEED);
    game.economy.player.wood = 0;
    game.economy.player.stone = 0;
    game.economy.player.gold = 0;
    game.economy.player.maxSupply = 50;
    const before = unitsOf(game, 'Peon', 'player');
    expect(trainUnit(game, 'Peon', 'player')).toBe(false);
    expect(unitsOf(game, 'Peon', 'player')).toBe(before);
  });

  it('refuses to train a Peon past the peon cap', () => {
    const game = startGame(SEED);
    game.economy.player.wood = 9999;
    game.economy.player.maxSupply = 50;
    // train until the cap is hit (base cap = 4)
    let attempts = 0;
    while (trainUnit(game, 'Peon', 'player') && attempts < 20) attempts += 1;
    // next attempt is refused — capped
    expect(trainUnit(game, 'Peon', 'player')).toBe(false);
  });

  it('trains a Footman for the player when supply + gold allow', () => {
    const game = startGame(SEED);
    game.economy.player.gold = 9999;
    game.economy.player.maxSupply = 50;
    const before = unitsOf(game, 'Footman', 'player');
    expect(trainUnit(game, 'Footman', 'player')).toBe(true);
    expect(unitsOf(game, 'Footman', 'player')).toBe(before + 1);
  });

  it('the enemy faction can train via the same channel (symmetry)', () => {
    const game = startGame(SEED);
    game.economy.enemy.wood = 9999;
    game.economy.enemy.gold = 9999;
    game.economy.enemy.maxSupply = 50;
    const beforePeon = unitsOf(game, 'Peon', 'enemy');
    const beforeFootman = unitsOf(game, 'Footman', 'enemy');
    expect(trainUnit(game, 'Peon', 'enemy')).toBe(true);
    expect(trainUnit(game, 'Footman', 'enemy')).toBe(true);
    expect(unitsOf(game, 'Peon', 'enemy')).toBe(beforePeon + 1);
    expect(unitsOf(game, 'Footman', 'enemy')).toBe(beforeFootman + 1);
  });
});
