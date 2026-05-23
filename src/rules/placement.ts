import { ECONOMY } from '@/config/economy';
import type { BoardData } from '@/core/board';
import type { BuildingType } from '@/ecs/components';
import { canAfford, type GameEconomy, type ResourceCost } from '@/game/economy';

/**
 * Resource cost per buildable building type. `TownHall` is excluded — it is a
 * generation-time attractor, never built mid-game (spec 102).
 */
export const BUILDING_COSTS: Record<
  Exclude<BuildingType, 'TownHall'>,
  ResourceCost
> = ECONOMY.buildingCosts;

/** Supply each building contributes once complete. */
export const BUILDING_SUPPLY: Record<BuildingType, number> = ECONOMY.buildingSupply;

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
