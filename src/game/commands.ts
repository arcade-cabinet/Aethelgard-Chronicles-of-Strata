import { getHexKey } from '@/core/hex';
import { findPath } from '@/core/pathfinding';
import { HexPosition, PathQueue } from '@/ecs/components';
import type { GameState } from './game-state';

/**
 * Encode a path tile key into a `"q,r,level"` step. The level travels with the
 * step so the path-follow system can set the pawn's Y height on ramp traversal
 * without holding a board reference.
 */
function toLeveledStep(game: GameState, key: string): string {
  const tile = game.board.tiles.get(key);
  return `${key},${tile?.level ?? 0}`;
}

/**
 * Issue a move order: path the player pawn to `targetKey`. Runs A* from the
 * pawn's current tile; on success writes the path (excluding the start tile,
 * each step carrying its elevation level) into the pawn's PathQueue and returns
 * the tile-key path. Returns null when the target is unreachable, leaving the
 * queue untouched.
 */
export function planMoveOrder(game: GameState, targetKey: string): string[] | null {
  const hex = game.playerPawn.get(HexPosition);
  if (!hex) return null;
  const startKey = getHexKey(hex.q, hex.r);
  const path = findPath(game.navGraph, startKey, targetKey);
  if (!path || path.length < 2) return null;
  // drop the start tile — the pawn is already there
  const steps = path.slice(1).map((key) => toLeveledStep(game, key));
  game.playerPawn.set(PathQueue, { steps });
  return path;
}

/**
 * Issue a move order, returning whether a path was found. Thin boolean wrapper
 * over `planMoveOrder` for callers that do not need the path itself.
 */
export function issueMoveOrder(game: GameState, targetKey: string): boolean {
  return planMoveOrder(game, targetKey) !== null;
}
