import type { BoardData } from '@/core/board';
import type { ResourceType } from '@/ecs/components';
import type { Rng } from '@/core/rng';

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

/** Per-resource spawn config: eligible biomes, chance per eligible tile, amount. */
const SPAWN_RULES: Array<{
  resourceType: ResourceType;
  biomes: ReadonlySet<string>;
  chance: number;
  amount: number;
}> = [
  { resourceType: 'wood', biomes: new Set(['FOREST']), chance: 0.45, amount: 100 },
  { resourceType: 'stone', biomes: new Set(['HIGHLAND', 'MOUNTAIN']), chance: 0.3, amount: 80 },
  { resourceType: 'gold', biomes: new Set(['GRASS', 'HIGHLAND']), chance: 0.08, amount: 60 },
];

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
