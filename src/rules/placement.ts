import { ECONOMY } from '@/config/economy';
import type { BoardData } from '@/core/board';
import type { BuildingType } from '@/ecs/components';
import { canAfford, type GameEconomy, type ResourceCost } from '@/game/economy';
import { BUILDING_PROFILES } from './building-profiles';

/**
 * Resource cost per buildable building type. `TownHall` is excluded — it is a
 * generation-time attractor, never built mid-game (spec 102).
 *
 * M_REGISTRY.5 — derived from the unified registry rather than read
 * directly from `economy.json`. The registry is the single source; the
 * JSON tunes registry values, not parallel tables.
 */
export const BUILDING_COSTS: Record<Exclude<BuildingType, 'TownHall'>, ResourceCost> =
  Object.freeze(
    Object.fromEntries(
      (Object.entries(BUILDING_PROFILES) as Array<[BuildingType, (typeof BUILDING_PROFILES)[BuildingType]]>)
        .filter(([type, p]) => type !== 'TownHall' && p.cost !== undefined)
        .map(([type, p]) => [type, p.cost as ResourceCost]),
    ),
  ) as Record<Exclude<BuildingType, 'TownHall'>, ResourceCost>;

/**
 * Supply each building contributes once complete. M_REGISTRY.5 — derived
 * from the unified registry instead of a parallel `economy.json` table.
 */
export const BUILDING_SUPPLY: Record<BuildingType, number> = Object.freeze(
  Object.fromEntries(
    (Object.entries(BUILDING_PROFILES) as Array<[BuildingType, (typeof BUILDING_PROFILES)[BuildingType]]>).map(
      ([type, p]) => [type, p.supply],
    ),
  ),
) as Record<BuildingType, number>;

/** Biomes any building may be placed on. */
const BUILDABLE_BIOMES = new Set(ECONOMY.buildableBiomes);

/** The result of a placement-validity check. */
export interface PlacementCheck {
  /** Whether placement is allowed. */
  ok: boolean;
  /** Human-readable reason when `ok` is false. */
  reason: string;
}

/**
 * Whether a building of `type` may be placed on `tileKey` by a faction with
 * `economy`. The tile must be a buildable biome, unoccupied, and the faction
 * must afford the cost. Faction-agnostic — the human UI and the AI player both
 * consult this (spec 101).
 */
export function canBuild(
  board: BoardData,
  occupied: ReadonlySet<string>,
  tileKey: string,
  type: Exclude<BuildingType, 'TownHall'>,
  economy: GameEconomy,
): PlacementCheck {
  const tile = board.tiles.get(tileKey);
  if (!tile) return { ok: false, reason: 'No such tile' };
  if (!BUILDABLE_BIOMES.has(tile.type)) {
    return { ok: false, reason: 'Must build on grass, highland, or beach' };
  }
  if (occupied.has(tileKey)) return { ok: false, reason: 'Tile is occupied' };
  if (!canAfford(economy, BUILDING_COSTS[type])) {
    return { ok: false, reason: 'Not enough resources' };
  }
  return { ok: true, reason: '' };
}
