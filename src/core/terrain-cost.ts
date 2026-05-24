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
  BEACH: 1,
  DESERT: 1,
  GRASS: 1,
  FOREST: 1.25,
  HIGHLAND: 1.5,
  MOUNTAIN: 1, // impassable; cost is unused
};

export function moveCostFor(biome: BiomeType): number {
  return TERRAIN_MOVE_COST[biome] ?? 1;
}
