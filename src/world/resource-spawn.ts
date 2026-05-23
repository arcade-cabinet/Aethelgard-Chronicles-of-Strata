import { ECONOMY } from '@/config/economy';
import type { BoardData } from '@/core/board';
import type { Rng } from '@/core/rng';
import type { ResourceType } from '@/ecs/components';

/** A planned resource node placement. */
export interface ResourceNodePlan {
  /** Hex key of the tile the node sits on. */
  key: string;
  /** Axial q. */
  q: number;
  /** Axial r. */
  r: number;
  /** Elevation level. */
  level: number;
  /** What the node yields. */
  resourceType: ResourceType;
  /** Starting amount. */
  amount: number;
}

/** Per-resource spawn rule with the eligible-biome list as a Set for fast lookup. */
const SPAWN_RULES: Array<{
  resourceType: ResourceType;
  biomes: ReadonlySet<string>;
  chance: number;
  amount: number;
}> = ECONOMY.resourceSpawn.map((r) => ({ ...r, biomes: new Set(r.biomes) }));

/**
 * Plan resource node placements across the board. Deterministic given `rng`
 * (the map PRNG stream). Each tile gets at most one node — the first matching
 * rule wins. Mountain tiles (level >= 5) are not walkable but their rock is
 * still harvestable from an adjacent tile.
 *
 * `protectedCenters` (M_MAPGEN.7) — tiles within `SAFETY_RADIUS` hexes of
 * any center are excluded from random resource placement so each faction's
 * starting ring stays buildable. Trees + ores can still spawn farther out
 * via the normal rules.
 */
export const SAFETY_RADIUS = 3;

export function spawnResourceNodes(
  board: BoardData,
  rng: Rng,
  protectedCenters: ReadonlyArray<{ q: number; r: number }> = [],
): ResourceNodePlan[] {
  const nodes: ResourceNodePlan[] = [];
  const sortedKeys = [...board.tiles.keys()].sort();
  for (const key of sortedKeys) {
    const tile = board.tiles.get(key);
    if (!tile) continue;
    // never place a resource node on a crossing landing — it would block it
    if (tile.isCrossingLanding) continue;
    // M_MAPGEN.7 — keep the 3-tile safety radius around each FactionBase
    // clear so the player has guaranteed buildable space at start.
    let blocked = false;
    for (const c of protectedCenters) {
      const d =
        (Math.abs(tile.q - c.q) + Math.abs(tile.r - c.r) + Math.abs(tile.q + tile.r - c.q - c.r)) /
        2;
      if (d <= SAFETY_RADIUS) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    for (const rule of SPAWN_RULES) {
      if (!rule.biomes.has(tile.type)) continue;
      if (rng() < rule.chance) {
        nodes.push({
          key,
          q: tile.q,
          r: tile.r,
          level: tile.level,
          resourceType: rule.resourceType,
          amount: rule.amount,
        });
        break; // one node per tile
      }
    }
  }
  return nodes;
}
