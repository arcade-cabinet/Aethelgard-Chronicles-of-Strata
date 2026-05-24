import { describe, expect, it } from 'vitest';
import { getHexKey } from '@/core/hex';
import { DefensiveBehavior, Gate, HexPosition, MoverBehavior } from '@/ecs/components';
import { placeBuilding, placeRoad } from '@/game/commands';
import { startGame } from '@/game/game-state';
import { buildGateMap } from '@/rules';

describe('placeRoad (M_FEATURE.1)', () => {
  /** Find a walkable tile that is not the home base or a build site. */
  function freeWalkableTile(game: ReturnType<typeof startGame>): string {
    for (const [key, tile] of game.board.tiles) {
      if (!tile.walkable) continue;
      if (key === game.townHallKey || key === game.enemyBaseKey) continue;
      if (game.buildSites.has(key)) continue;
      return key;
    }
    throw new Error('no free walkable tile');
  }

  it('spawns a stone Mover entity + spends the stone cost', () => {
    const game = startGame('road-test-1');
    const key = freeWalkableTile(game);
    const before = game.economy.player.stone;
    expect(placeRoad(game, key, 'stone')).toBe(true);
    expect(game.economy.player.stone).toBe(before - 5);
    // M_MICRO.6.9 — query for the placed key specifically + assert
    // the material; the prior "any stone mover exists" check would
    // pass even if the road landed on a totally different tile.
    let foundOnKey = false;
    for (const e of game.world.query(MoverBehavior, HexPosition)) {
      const h = e.get(HexPosition);
      if (h && getHexKey(h.q, h.r) === key) {
        expect(e.get(MoverBehavior)?.material).toBe('stone');
        foundOnKey = true;
      }
    }
    expect(foundOnKey).toBe(true);
  });

  it('rejects placement on the player Town Hall', () => {
    const game = startGame('road-test-2');
    const before = game.economy.player.stone;
    expect(placeRoad(game, game.townHallKey, 'stone')).toBe(false);
    expect(game.economy.player.stone).toBe(before); // no spend
  });

  it('composes a Gate when placed on an existing Wall', () => {
    const game = startGame('road-test-3');
    // grant resources so the test focuses on composition, not affordability
    game.economy.player.wood = 999;
    game.economy.player.stone = 999;
    const key = freeWalkableTile(game);
    expect(placeBuilding(game, key, 'Wall', 'player')).toBe(true);
    const wallEntity = game.buildSites.get(key);
    expect(wallEntity?.has(DefensiveBehavior)).toBe(true);
    expect(wallEntity?.has(Gate)).toBe(false);
    // road on the wall tile composes Gate
    expect(placeRoad(game, key, 'stone', 'player')).toBe(true);
    expect(wallEntity?.has(Gate)).toBe(true);
    expect(wallEntity?.has(MoverBehavior)).toBe(true);
    // buildGateMap sees the new gate
    const gates = buildGateMap(game.world);
    expect(gates.get(key)).toBe('player');
  });

  it('honors faction — enemy roads spend enemy economy', () => {
    const game = startGame('road-test-4');
    const key = freeWalkableTile(game);
    game.economy.enemy.stone = 100;
    const before = game.economy.enemy.stone;
    expect(placeRoad(game, key, 'stone', 'enemy')).toBe(true);
    expect(game.economy.enemy.stone).toBe(before - 5);
  });
});
