import { describe, expect, it } from 'vitest';
import { FactionTrait, HexPosition, PathQueue } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { moveUnit, placeBuilding } from '@/game/utilities';
import { startGame } from '@/game/game-state';

const SEED = 'ancient-silver-forest';

// M_V11.OPEN.SPAWN — playerPawn now points at the Palace entity
// (no Movement trait), so moveUnit-on-playerPawn is a no-op by
// design. These tests spawn a Peon explicitly to exercise moveUnit.
function spawnPlayerPeon(game: ReturnType<typeof startGame>) {
  const [tq, tr] = game.palaceKey.split(',').map(Number) as [number, number];
  // Find a walkable neighbor of the Palace for the peon.
  const dirs: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ];
  for (const [dq, dr] of dirs) {
    const tile = game.board.tiles.get(`${tq + dq},${tr + dr}`);
    if (tile?.walkable) {
      return createCharacter({
        world: game.world,
        role: 'Peon',
        q: tile.q,
        r: tile.r,
        level: tile.level,
        selected: false,
      });
    }
  }
  throw new Error('no walkable neighbor of Palace');
}

describe('command API — faction parameter (M8.3)', () => {
  it('moveUnit moves a unit owned by the issuing faction', () => {
    const game = startGame(SEED);
    const pawn = spawnPlayerPeon(game);
    const hex = pawn.get(HexPosition);
    expect(hex).toBeDefined();
    // find any reachable tile via the nav graph
    const startKey = `${hex?.q},${hex?.r}`;
    const neighbours = game.navGraph.get(startKey);
    if (!neighbours) throw new Error('expected nav graph entry');
    const reachable = [...neighbours][0];
    expect(reachable).toBeDefined();
    const path = moveUnit(game, pawn, reachable as string, 'player');
    expect(path).not.toBeNull();
    expect(pawn.get(PathQueue)?.steps.length ?? 0).toBeGreaterThan(0);
  });

  it('moveUnit refuses a unit not owned by the issuing faction', () => {
    const game = startGame(SEED);
    const pawn = spawnPlayerPeon(game);
    const hex = pawn.get(HexPosition);
    const startKey = `${hex?.q},${hex?.r}`;
    const neighbours = game.navGraph.get(startKey);
    if (!neighbours) throw new Error('expected nav graph entry');
    const reachable = [...neighbours][0] as string;
    const path = moveUnit(game, pawn, reachable, 'enemy');
    expect(path).toBeNull();
  });

  it('placeBuilding stamps the building with the issuing faction', () => {
    const game = startGame(SEED);
    // find a buildable tile next to the town hall
    const { q, r } = (() => {
      const [tq, tr] = game.palaceKey.split(',').map(Number);
      return { q: tq ?? 0, r: tr ?? 0 };
    })();
    // give the economy plenty so the spend succeeds
    game.economy.player.wood = 9999;
    game.economy.player.stone = 9999;
    game.economy.player.gold = 9999;
    // try neighbours until one is a valid placement
    let placed = false;
    const dirs: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [1, -1],
    ];
    for (const [dq, dr] of dirs) {
      const key = `${q + dq},${r + dr}`;
      if (placeBuilding(game, key, 'Farm', 'player')) {
        const entity = game.buildSites.get(key);
        expect(entity?.get(FactionTrait)?.faction).toBe('player');
        placed = true;
        break;
      }
    }
    expect(placed).toBe(true);
  });
});
