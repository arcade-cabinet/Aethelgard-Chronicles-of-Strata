import type { Tile } from './board';
import { HEX_DIRECTIONS } from '@/config/world';
import { getHexKey } from './hex';
import type { Rng } from './rng';

/** A placed ramp connecting a lower tile to the adjacent tile one level above. */
export interface Ramp {
  /** Hex key of the lower tile. */
  lowKey: string;
  /** Hex key of the higher tile. */
  highKey: string;
}

/** Order-independent key identifying the edge between two tiles. */
export function rampKey(keyA: string, keyB: string): string {
  return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
}

/** Probability that an eligible edge receives a ramp. Tuned for chokepoint feel. */
const RAMP_CHANCE = 0.35;

/**
 * Place ramps on eligible tile edges. An edge is eligible when both tiles are
 * walkable and their levels differ by exactly 1. Placement is stochastic (driven
 * by the map PRNG) so not every eligible edge gets a ramp.
 */
export function placeRamps(tiles: Map<string, Tile>, rng: Rng): Map<string, Ramp> {
  const ramps = new Map<string, Ramp>();
  // Sort keys for deterministic iteration order regardless of Map insertion order.
  const sortedKeys = [...tiles.keys()].sort();
  for (const key of sortedKeys) {
    const tile = tiles.get(key);
    if (!tile || !tile.walkable) continue;
    for (const dir of HEX_DIRECTIONS) {
      const neighborKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
      const neighbor = tiles.get(neighborKey);
      if (!neighbor || !neighbor.walkable) continue;
      // Visit each eligible edge once, from the lower tile, so the PRNG draw
      // sequence is stable. delta is exactly +1 here.
      if (neighbor.level !== tile.level + 1) continue;
      const edge = rampKey(key, neighborKey);
      if (ramps.has(edge)) continue;
      if (rng() < RAMP_CHANCE) {
        // derive low/high by level comparison, not loop direction — robust if
        // the eligibility filter above is ever relaxed.
        const tileIsLower = tile.level < neighbor.level;
        ramps.set(edge, {
          lowKey: tileIsLower ? key : neighborKey,
          highKey: tileIsLower ? neighborKey : key,
        });
      }
    }
  }
  return ramps;
}
