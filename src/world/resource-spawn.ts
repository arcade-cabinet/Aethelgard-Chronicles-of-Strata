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
 */
export function spawnResourceNodes(board: BoardData, rng: Rng): ResourceNodePlan[] {
  const nodes: ResourceNodePlan[] = [];
  const sortedKeys = [...board.tiles.keys()].sort();
  for (const key of sortedKeys) {
    const tile = board.tiles.get(key);
    if (!tile) continue;
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
