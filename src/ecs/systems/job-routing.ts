import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { areAdjacent, getHexKey } from '@/core/hex';
import { type NavGraph, findPath } from '@/core/pathfinding';
import { AssignedJob, Carrier, HexPosition, PathQueue } from '@/ecs/components';

/** Encode a path of tile keys into "q,r,level" steps using board elevation. */
function leveledSteps(board: BoardData, path: string[]): string[] {
  return path.map((key) => `${key},${board.tiles.get(key)?.level ?? 0}`);
}

/**
 * Route peon jobs. A SEEKING peon adjacent to its resource flips to HARVESTING;
 * otherwise it is given an A* path toward a tile adjacent to the resource. A
 * CARRYING peon with an empty path is given a path back to the Town Hall.
 * This system makes the harvest loop self-driving.
 */
export function jobRoutingSystem(
  world: World,
  board: BoardData,
  graph: NavGraph,
  townHallKey: string,
): void {
  world.query(AssignedJob, HexPosition, PathQueue, Carrier).updateEach(([job, hex, path]) => {
    const peonKey = getHexKey(hex.q, hex.r);

    if (job.state === 'SEEKING') {
      if (areAdjacent(peonKey, job.targetKey)) {
        job.state = 'HARVESTING';
        path.steps = [];
        return;
      }
      if (path.steps.length === 0) {
        const route = findPathToAdjacent(graph, board, peonKey, job.targetKey);
        if (route) path.steps = leveledSteps(board, route);
      }
    } else if (job.state === 'CARRYING') {
      if (path.steps.length === 0 && !areAdjacent(peonKey, townHallKey)) {
        const route = findPathToAdjacent(graph, board, peonKey, townHallKey);
        if (route) path.steps = leveledSteps(board, route);
      }
    }
  });
}

/** Find a path ending on a tile adjacent to `targetKey` (which may be unwalkable). */
function findPathToAdjacent(
  graph: NavGraph,
  board: BoardData,
  startKey: string,
  targetKey: string,
): string[] | null {
  // if the target itself is walkable, path straight to it
  if (graph.has(targetKey)) {
    const direct = findPath(graph, startKey, targetKey);
    if (direct) return direct.slice(1);
  }
  // otherwise path to the nearest walkable neighbor of the target
  const [tq, tr] = targetKey.split(',').map(Number);
  let best: string[] | null = null;
  for (const dir of neighborKeys(tq ?? 0, tr ?? 0)) {
    if (!graph.has(dir)) continue;
    const route = findPath(graph, startKey, dir);
    if (route && (best === null || route.length < best.length + 1)) best = route.slice(1);
  }
  return best;
}

/** The six neighbor keys of an axial coordinate. */
function neighborKeys(q: number, r: number): string[] {
  return [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ].map(([dq, dr]) => getHexKey(q + (dq ?? 0), r + (dr ?? 0)));
}
