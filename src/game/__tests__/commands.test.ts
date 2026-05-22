import { describe, expect, it } from 'vitest';
import { HexPosition, PathQueue } from '@/ecs/components';
import { issueMoveOrder } from '@/game/commands';
import { startGame } from '@/game/game-state';

describe('issueMoveOrder', () => {
  it('writes an A* path into the pawn PathQueue for a reachable tile', () => {
    const game = startGame('ancient-silver-forest');
    const pawnHex = game.playerPawn.get(HexPosition);
    const startKey = `${pawnHex?.q},${pawnHex?.r}`;
    const reachable = [...(game.navGraph.get(startKey) ?? [])][0];
    expect(reachable).toBeDefined();
    expect(issueMoveOrder(game, reachable as string)).toBe(true);
    expect(game.playerPawn.get(PathQueue)?.steps.length).toBeGreaterThan(0);
  });

  it('returns false for an unreachable tile and leaves the queue empty', () => {
    const game = startGame('ancient-silver-forest');
    expect(issueMoveOrder(game, '999,999')).toBe(false);
    expect(game.playerPawn.get(PathQueue)?.steps).toEqual([]);
  });
});
