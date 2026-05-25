import { ECONOMY } from '@/config/economy';
import type { BoardData } from '@/core/board';
import { hexDistance } from '@/core/hex';
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

/**
 * M_FUN.ECON.NODE-TIERS (v0.5.B) — node `amount` is scaled by
 * distance from board centre to create three implicit tiers:
 *
 *   - surface (d > 0.66 * radius) → 0.6× amount, 1.0× chance
 *     "quick & cheap" coastal nodes — first 60s economy boost.
 *   - inland  (0.33 < d/radius ≤ 0.66) → 1.0× amount (baseline)
 *     mid-game sustained harvest.
 *   - highland (d/radius ≤ 0.33) → 1.5× amount, 0.8× chance
 *     late-game commitment, fewer-but-bigger deposits.
 *
 * The same Peon harvests all three at the same rate; what
 * changes is the round-trip economy. The tier system creates
 * the decision track "should I extend the supply line for the
 * deep grove, or claim three surface trees?" without adding
 * any new building or rule code.
 */
function tierMultipliers(
  q: number,
  r: number,
  boardRadius: number,
): { amountMul: number; chanceMul: number } {
  const d = hexDistance(q, r, 0, 0);
  const ratio = boardRadius > 0 ? d / boardRadius : 0;
  if (ratio > 0.66) return { amountMul: 0.6, chanceMul: 1.0 };
  if (ratio > 0.33) return { amountMul: 1.0, chanceMul: 1.0 };
  return { amountMul: 1.5, chanceMul: 0.8 };
}

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
      const d = hexDistance(c.q, c.r, tile.q, tile.r);
      if (d <= SAFETY_RADIUS) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    const tier = tierMultipliers(tile.q, tile.r, board.radius);
    for (const rule of SPAWN_RULES) {
      if (!rule.biomes.has(tile.type)) continue;
      if (rng() < rule.chance * tier.chanceMul) {
        nodes.push({
          key,
          q: tile.q,
          r: tile.r,
          level: tile.level,
          resourceType: rule.resourceType,
          amount: Math.round(rule.amount * tier.amountMul),
        });
        break; // one node per tile
      }
    }
  }
  return nodes;
}
