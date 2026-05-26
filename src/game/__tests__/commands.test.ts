import { describe, expect, it } from 'vitest';
import { HexPosition, PathQueue } from '@/ecs/components';
import { createCharacter } from '@/entities/character-factory';
import { issueMoveOrder, moveUnit } from '@/game/commands';
import { startGame } from '@/game/game-state';

// M_V11.OPEN.SPAWN — playerPawn now points at the Palace entity
// (no PathQueue, no Movement). These tests spawn a Peon explicitly
// to exercise move-order behavior against a movable unit.
function spawnPeonAdjacentToPalace(game: ReturnType<typeof startGame>) {
  const [tq, tr] = game.townHallKey.split(',').map(Number) as [number, number];
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
      });
    }
  }
  throw new Error('no walkable neighbor of Palace');
}

describe('issueMoveOrder', () => {
  it('writes an A* path into a Peon PathQueue for a reachable tile', () => {
    const game = startGame('ancient-silver-forest');
    const pawn = spawnPeonAdjacentToPalace(game);
    const hex = pawn.get(HexPosition);
    const startKey = `${hex?.q},${hex?.r}`;
    const reachable = [...(game.navGraph.get(startKey) ?? [])][0];
    expect(reachable).toBeDefined();
    // M_V11: issueMoveOrder targets game.playerPawn (Palace) which
    // has no Movement; use moveUnit directly to test a Peon's move.
    expect(moveUnit(game, pawn, reachable as string, 'player')).not.toBeNull();
    expect(pawn.get(PathQueue)?.steps.length).toBeGreaterThan(0);
  });

  it('issueMoveOrder on the (immovable) Palace playerPawn returns false', () => {
    const game = startGame('ancient-silver-forest');
    // The playerPawn anchor (Palace) has no Movement / PathQueue.
    // issueMoveOrder is now a no-op-by-design until the player
    // queues actual units.
    expect(issueMoveOrder(game, '999,999')).toBe(false);
  });
});
