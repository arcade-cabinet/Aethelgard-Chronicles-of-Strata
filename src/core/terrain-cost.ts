/**
 * M_POLISH2.RTS.24 — per-biome movement cost.
 *
 * A* over the nav graph multiplies tentative gScore by the per-tile
 * cost. Default 1.0 = baseline (GRASS, BEACH, DESERT). FOREST is
 * 1.25× (dense undergrowth slows units), HIGHLAND is 1.5× (steep
 * climb). MOUNTAIN is impassable (filtered out by walkable=false in
 * the nav-graph builder; the cost is irrelevant there).
 *
 * Asymmetric design choice: ranged combat already favours high
 * ground (RTS.20); piling a slow-to-CLIMB cost on top of that makes
 * highland advance a real trade-off rather than a free uphill rush.
 */
import type { BiomeType } from './biome';

export const TERRAIN_MOVE_COST: Record<BiomeType, number> = {
  OCEAN: 1, // water tiles are impassable; cost is unused
  LAKE: 1,
  // M_FUN.MAP.UTILISATION.SHALLOWS — 1.8× cost for aquatic units
  // that can traverse it (Ferryman). Land units never reach this
  // cost because biome-flags marks SHALLOWS unwalkable for them.
  SHALLOWS: 1.8,
  // M_FUN.MAP.SWAMP — walkable but punishingly slow (1.8×). Combined
  // with the disease DoT on traversal, swamp = "you can cross but
  // only with a Healer + the willingness to take a long time".
  SWAMP: 1.8,
  BEACH: 1,
  DESERT: 1,
  GRASS: 1,
  FOREST: 1.25,
  HIGHLAND: 1.5,
  // M_FUN.MAP.PASS — the fortifiable choke. ~0.6× would imply
  // FASTER than baseline, which is wrong; we want passes to be
  // notably slower than HIGHLAND (1.5×) so they read as "carved
  // path through stone" — 1.7× is the right semantic. The spec's
  // "~0.6× speed" reference was inverted; cost is the inverse of
  // speed, so 1.7× cost ≈ 0.6× speed. Documented to prevent the
  // next reader from "fixing" it.
  MOUNTAIN_PASS: 1.7,
  MOUNTAIN: 1, // impassable; cost is unused
  // M_FUN.DYN.VOLCANO — both impassable. LAVA was originally 2.5×
  // walkable but A* would route units across active lava (reviewer
  // CRITICAL #2). LAVA is now hard-impassable in biome-flags;
  // cost here is unused but defined to satisfy the exhaustive
  // record type.
  VOLCANO: 1,
  LAVA: 1,
  // M_FUN.ECON.QUICKSAND — walkable but slow (1.6× baseline) per
  // mapgen.json#QUICKSAND.moveCost. A* will route AROUND it unless
  // it's the only path; quick-cross is a deliberate choice.
  QUICKSAND: 1.6,
  // M_V6.CARRY.RUINS-BIOME — cleared-camp tiles cost 1× like grass;
  // the territory is recoverable. Decorative-only difference.
  RUINS: 1,
};

export function moveCostFor(biome: BiomeType): number {
  return TERRAIN_MOVE_COST[biome] ?? 1;
}

/**
 * Build a costOf(key) closure suitable for `findPath`. Takes a
 * board's tiles map; returns 1.0 for unknown keys (defensive — A*
 * iterates neighbours from the nav graph which was built from the
 * same board, so unknown keys shouldn't happen but the fallback
 * prevents a corrupt save from crashing the pathfind).
 *
 * Usage:
 *   const costOf = makeMoveCostFn(game.board.tiles);
 *   const path = findPath(game.navGraph, startKey, targetKey, costOf);
 */
import type { BoardData } from './board';
export function makeMoveCostFn(tiles: BoardData['tiles']): (key: string) => number {
  return (key) => {
    const t = tiles.get(key);
    return t ? moveCostFor(t.type) : 1;
  };
}
