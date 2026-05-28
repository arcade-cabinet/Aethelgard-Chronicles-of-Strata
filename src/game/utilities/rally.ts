import type { Entity } from 'koota';
import type { BoardData } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { findPath, type NavGraph } from '@/core/pathfinding';
import { makeMoveCostFn } from '@/core/terrain-cost';
import { HexPosition, PathQueue } from '@/ecs/components';

/** The barracks rally point — where newly trained footmen go. */
export interface RallyState {
  /** The rally tile key, or '' when unset. */
  targetKey: string;
}

/** Create an unset rally state. */
export function createRally(): RallyState {
  return { targetKey: '' };
}

/** Set (or move) the rally point to a tile. */
export function setRallyPoint(rally: RallyState, tileKey: string): void {
  rally.targetKey = tileKey;
}

/**
 * Path a unit to the current rally point. Called right after a footman is
 * trained. No-op when no rally point is set or no path exists.
 */
export function applyRallyPoint(
  unit: Entity,
  board: BoardData,
  graph: NavGraph,
  rally: RallyState,
): void {
  if (rally.targetKey === '') return;
  const hex = unit.get(HexPosition);
  if (!hex) return;
  // M_POLISH2.RTS.24a — terrain-aware rally path.
  const route = findPath(
    graph,
    getHexKey(hex.q, hex.r),
    rally.targetKey,
    makeMoveCostFn(board.tiles),
  );
  if (!route || route.length < 2) return;
  unit.set(PathQueue, {
    steps: route.slice(1).map((k) => `${k},${board.tiles.get(k)?.level ?? 0}`),
  });
}
