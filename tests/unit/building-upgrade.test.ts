import { describe, expect, it } from 'vitest';
import { Building, FactionTrait, HexPosition } from '@/ecs/components';
import { upgradeBuilding } from '@/game/utilities';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.86 — Building upgrade tiers. Tests the upgradeBuilding
 * command (Building.tier 1→2→3), the per-tier delta cost ladder,
 * and the reject paths (not complete / max tier / wrong faction /
 * can't afford / Palace exempt).
 */
describe('M_EXPANSION.F.86 — Building upgrade tiers', () => {
  it('refuses to upgrade an incomplete building', () => {
    const game = startGame('upgrade-incomplete');
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const e = game.world.spawn(
      Building({ buildingType: 'Farm', isComplete: false, progress: 0.5 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    expect(upgradeBuilding(game, e)).toBe(false);
  });

  it('upgrades a complete Farm 1 → 2 → 3 with per-tier delta cost', () => {
    const game = startGame('upgrade-ladder');
    game.economy.player.wood = 10000;
    game.economy.player.stone = 10000;
    game.economy.player.gold = 10000;
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const e = game.world.spawn(
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    expect(e.get(Building)?.tier).toBe(1);
    expect(upgradeBuilding(game, e)).toBe(true);
    expect(e.get(Building)?.tier).toBe(2);
    expect(upgradeBuilding(game, e)).toBe(true);
    expect(e.get(Building)?.tier).toBe(3);
    // Tier 3 is the max — further upgrade rejects.
    expect(upgradeBuilding(game, e)).toBe(false);
    expect(e.get(Building)?.tier).toBe(3);
  });

  it('rejects upgrade when player can not afford the delta cost', () => {
    const game = startGame('upgrade-broke');
    game.economy.player.wood = 0;
    game.economy.player.stone = 0;
    game.economy.player.gold = 0;
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const e = game.world.spawn(
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    expect(upgradeBuilding(game, e)).toBe(false);
    expect(e.get(Building)?.tier).toBe(1);
  });

  it('refuses to upgrade an enemy building when called as player', () => {
    const game = startGame('upgrade-faction-guard');
    game.economy.player.wood = 10000;
    game.economy.player.stone = 10000;
    game.economy.player.gold = 10000;
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const e = game.world.spawn(
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'enemy' }),
    );
    expect(upgradeBuilding(game, e, 'player')).toBe(false);
  });

  it('refuses to upgrade a Palace (exempt — it is the FactionBase anchor)', () => {
    const game = startGame('upgrade-palace-exempt');
    game.economy.player.wood = 10000;
    game.economy.player.stone = 10000;
    game.economy.player.gold = 10000;
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const e = game.world.spawn(
      Building({ buildingType: 'Palace', isComplete: true, progress: 1 }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    expect(upgradeBuilding(game, e)).toBe(false);
  });
});
