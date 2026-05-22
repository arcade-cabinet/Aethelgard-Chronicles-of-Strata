import type { BoardData } from '@/core/board';
import type { BuildingType } from '@/ecs/components';
import { ECONOMY } from '@/config/economy';
import { type GameEconomy, type ResourceCost, canAfford } from './economy';

/** Resource cost per building type. Source: 70-rts-systems.md §Build Mode. */
export const BUILDING_COSTS: Record<
  Exclude<BuildingType, 'TownHall'>,
  ResourceCost
> = ECONOMY.buildingCosts;

/** Supply each building contributes once complete. */
export const BUILDING_SUPPLY: Record<BuildingType, number> = ECONOMY.buildingSupply;

/** Biomes a building may be placed on. */
const BUILDABLE_BIOMES = new Set(ECONOMY.buildableBiomes);

/** The result of a placement validity check. */
export interface PlacementCheck {
  /** Whether placement is allowed. */
  ok: boolean;
  /** Human-readable reason when `ok` is false. */
  reason: string;
}

/**
 * Whether a building may be placed on `tileKey`. The tile must be a buildable
 * biome, unoccupied, and the player must afford the cost.
 */
export function canPlaceBuilding(
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
