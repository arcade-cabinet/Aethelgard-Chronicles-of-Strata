import { describe, expect, it } from 'vitest';
import { getHexKey } from '@/core/hex';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { hiddenBonusSystem } from '@/ecs/systems/hidden-bonus';
import { startGame } from '@/game/game-state';

/**
 * M_EXPANSION.F.97 — discoverable hidden bonuses. Tests verify the
 * bonus credits + clears + only-once semantics.
 */
describe('M_EXPANSION.F.97 — hidden bonus discovery', () => {
  it('player unit on a hiddenBonus tile credits the bonus + clears it', () => {
    const game = startGame('hidden-bonus-grant');
    // Find a walkable tile, spawn a player unit on it, plant a bonus.
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    tile.hiddenBonus = { type: 'wood', amount: 25 };
    game.world.spawn(
      Unit({ unitType: 'Peon' }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    const beforeWood = game.economy.player.wood;
    const triggered = hiddenBonusSystem(game.world, game.board, game.economy.player);
    expect(triggered.length).toBe(1);
    expect(triggered[0]?.amount).toBe(25);
    expect(triggered[0]?.tileKey).toBe(getHexKey(tile.q, tile.r));
    expect(game.economy.player.wood).toBe(beforeWood + 25);
    expect(tile.hiddenBonus).toBeNull();
  });

  it('enemy unit on a hiddenBonus tile does NOT trigger', () => {
    const game = startGame('hidden-bonus-enemy-skip');
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    tile.hiddenBonus = { type: 'gold', amount: 60 };
    game.world.spawn(
      Unit({ unitType: 'Goblin' }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'enemy' }),
    );
    const beforeGold = game.economy.player.gold;
    const triggered = hiddenBonusSystem(game.world, game.board, game.economy.player);
    expect(triggered.length).toBe(0);
    expect(game.economy.player.gold).toBe(beforeGold);
    // Tile bonus stays — only player triggers consume.
    expect(tile.hiddenBonus).toEqual({ type: 'gold', amount: 60 });
  });

  it('second pass on the same tile is a no-op (bonus cleared)', () => {
    const game = startGame('hidden-bonus-once');
    const tile = [...game.board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    tile.hiddenBonus = { type: 'stone', amount: 40 };
    game.world.spawn(
      Unit({ unitType: 'Peon' }),
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      FactionTrait({ faction: 'player' }),
    );
    const first = hiddenBonusSystem(game.world, game.board, game.economy.player);
    expect(first.length).toBe(1);
    const second = hiddenBonusSystem(game.world, game.board, game.economy.player);
    expect(second.length).toBe(0);
  });

  it('seeds bonuses deterministically — same seed → same count', () => {
    const a = startGame({
      seedPhrase: 'bonus-deterministic',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    const b = startGame({
      seedPhrase: 'bonus-deterministic',
      mapSize: 12,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    let countA = 0;
    let countB = 0;
    for (const t of a.board.tiles.values()) if (t.hiddenBonus) countA++;
    for (const t of b.board.tiles.values()) if (t.hiddenBonus) countB++;
    expect(countA).toBe(countB);
    expect(countA).toBeGreaterThan(0);
  });
});
