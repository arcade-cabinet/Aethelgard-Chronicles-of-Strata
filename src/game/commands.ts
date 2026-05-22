import { getHexKey } from '@/core/hex';
import { findPath } from '@/core/pathfinding';
import { HexPosition, PathQueue } from '@/ecs/components';
import type { GameState } from './game-state';

/**
 * Issue a move order: path the player pawn to `targetKey`. Runs A* from the
 * pawn's current tile; on success writes the path (excluding the start tile)
 * into the pawn's PathQueue and returns true. Returns false when the target is
 * unreachable, leaving the queue untouched.
 */
export function issueMoveOrder(game: GameState, targetKey: string): boolean {
  const hex = game.playerPawn.get(HexPosition);
  if (!hex) return false;
  const startKey = getHexKey(hex.q, hex.r);
  const path = findPath(game.navGraph, startKey, targetKey);
  if (!path || path.length < 2) return false;
  // drop the start tile — the pawn is already there
  game.playerPawn.set(PathQueue, { steps: path.slice(1) });
  return true;
}
