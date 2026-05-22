import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import { areAdjacent, getHexKey, hexDistance, hexNeighbors } from '@/core/hex';
import { type NavGraph, findPath } from '@/core/pathfinding';
import { AssignedJob, Carrier, HexPosition, PathQueue, ResourceTrait } from '@/ecs/components';

/** Encode a path of tile keys into "q,r,level" steps using board elevation. */
function leveledSteps(board: BoardData, path: string[]): string[] {
  return path.map((key) => `${key},${board.tiles.get(key)?.level ?? 0}`);
}

/**
 * Route peon jobs — the engine of the autonomous harvest loop:
 * - IDLE peons (no job, or whose node depleted) are re-assigned to the nearest
 *   non-empty resource node. Without this the loop would stop after the first
 *   patch drained.
 * - SEEKING peons adjacent to their resource flip to HARVESTING; otherwise they
 *   are given an A* path to a tile *adjacent* to the resource (never onto it,
 *   so a walkable resource tile does not strand the peon).
 * - CARRYING peons with an empty path are routed back to the Town Hall.
 */
export function jobRoutingSystem(
  world: World,
  board: BoardData,
  graph: NavGraph,
  townHallKey: string,
): void {
  // index live resource nodes (amount > 0) by hex key
  const liveNodes: Array<{ key: string; q: number; r: number }> = [];
  for (const node of world.query(ResourceTrait, HexPosition)) {
    const res = node.get(ResourceTrait);
    const hex = node.get(HexPosition);
    if (res && hex && res.amount > 0) {
      liveNodes.push({ key: getHexKey(hex.q, hex.r), q: hex.q, r: hex.r });
    }
  }

  world.query(AssignedJob, HexPosition, PathQueue, Carrier).updateEach(([job, hex, path]) => {
    const peonKey = getHexKey(hex.q, hex.r);

    if (job.state === 'IDLE') {
      // re-assign to the nearest live resource node
      let nearest: { key: string; q: number; r: number } | null = null;
      let nearestDist = Number.POSITIVE_INFINITY;
      for (const node of liveNodes) {
        const d = hexDistance(hex.q, hex.r, node.q, node.r);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = node;
        }
      }
      if (nearest) {
        job.state = 'SEEKING';
        job.targetKey = nearest.key;
      }
      return;
    }

    if (job.state === 'SEEKING') {
      if (areAdjacent(peonKey, job.targetKey) || peonKey === job.targetKey) {
        job.state = 'HARVESTING';
        path.steps = [];
        return;
      }
      if (path.steps.length === 0) {
        const route = pathToAdjacent(graph, peonKey, job.targetKey);
        if (route) {
          path.steps = leveledSteps(board, route);
        } else {
          // unreachable node — drop the job so the peon re-assigns next tick
          job.state = 'IDLE';
          job.targetKey = '';
        }
      }
    } else if (job.state === 'CARRYING') {
      if (path.steps.length === 0 && !areAdjacent(peonKey, townHallKey)) {
        const route = pathToAdjacent(graph, peonKey, townHallKey);
        if (route) path.steps = leveledSteps(board, route);
      }
    }
  });
}

/**
 * Find a path that ends on a walkable tile adjacent to `targetKey`. The target
 * tile itself is never a destination — a peon must stand *next to* a resource
 * or the Town Hall to interact with it. Returns null when no adjacent tile is
 * reachable.
 */
function pathToAdjacent(graph: NavGraph, startKey: string, targetKey: string): string[] | null {
  const [tq, tr] = targetKey.split(',').map(Number);
  let best: string[] | null = null;
  for (const adj of hexNeighbors(tq ?? 0, tr ?? 0)) {
    if (!graph.has(adj)) continue;
    if (adj === startKey) return []; // already adjacent — no movement needed
    const route = findPath(graph, startKey, adj);
    if (route && (best === null || route.length < best.length)) best = route.slice(1);
  }
  return best;
}
