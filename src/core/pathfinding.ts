import { HEX_DIRECTIONS } from '@/config/world';
import type { BoardData } from './board';
import { crossingKey } from './crossings';
import { getHexKey, hexDistance, parseHexKey } from './hex';

/** The navigation graph: an adjacency list of walkable tile keys. */
export type NavGraph = Map<string, Set<string>>;

/**
 * Build the A* navigation graph from a board. An edge between two adjacent
 * walkable tiles exists when their levels are equal (`FLAT`), OR they differ by
 * exactly one level AND a crossing is placed on that edge (`CROSSING`). All
 * other adjacencies are `BLOCKED`. See `docs/specs/99-passability-and-slopes.md`.
 */
export function buildNavGraph(board: BoardData): NavGraph {
  const graph: NavGraph = new Map();
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const key = getHexKey(tile.q, tile.r);
    const neighbors = new Set<string>();
    for (const dir of HEX_DIRECTIONS) {
      const nKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
      const neighbor = board.tiles.get(nKey);
      if (!neighbor?.walkable) continue;
      const delta = Math.abs(neighbor.level - tile.level);
      if (delta === 0) {
        neighbors.add(nKey);
      } else if (delta === 1 && board.crossings.has(crossingKey(key, nKey))) {
        neighbors.add(nKey);
      }
    }
    graph.set(key, neighbors);
  }
  return graph;
}

// M_MICRO.2.2 — parseKey was the local hand-roll; replaced by the
// shared `parseHexKey` from @/core/hex.

/**
 * A* shortest path from `startKey` to `goalKey` over the nav graph. Uniform step
 * cost; the heuristic is hex distance. Returns the path as an inclusive list of
 * tile keys, or null when no path exists.
 */
export function findPath(graph: NavGraph, startKey: string, goalKey: string): string[] | null {
  if (!graph.has(startKey) || !graph.has(goalKey)) return null;
  if (startKey === goalKey) return [startKey];

  const goal = parseHexKey(goalKey);
  const heuristic = (key: string): number => {
    const p = parseHexKey(key);
    return hexDistance(p.q, p.r, goal.q, goal.r);
  };

  const open = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([[startKey, heuristic(startKey)]]);

  while (open.size > 0) {
    let current = '';
    let best = Number.POSITIVE_INFINITY;
    for (const key of open) {
      const f = fScore.get(key) ?? Number.POSITIVE_INFINITY;
      if (f < best) {
        best = f;
        current = key;
      }
    }

    if (current === goalKey) {
      const path = [current];
      let step = current;
      for (let prev = cameFrom.get(step); prev !== undefined; prev = cameFrom.get(step)) {
        step = prev;
        path.unshift(step);
      }
      return path;
    }

    open.delete(current);
    const currentG = gScore.get(current) ?? Number.POSITIVE_INFINITY;
    for (const neighbor of graph.get(current) ?? []) {
      const tentative = currentG + 1;
      if (tentative < (gScore.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentative);
        fScore.set(neighbor, tentative + heuristic(neighbor));
        open.add(neighbor);
      }
    }
  }
  return null;
}
