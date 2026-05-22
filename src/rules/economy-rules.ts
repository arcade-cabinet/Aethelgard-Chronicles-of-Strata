import { ECONOMY, buildingSupplyFor, supplyCostFor } from '@/config/economy';
import type { BuildingType, UnitType } from '@/ecs/components';
import type { GameEconomy } from '@/game/economy';

/** Supply each trainable unit consumes. Enemies are not supply-tracked. */
export const SUPPLY_COST: Record<UnitType, number> = ECONOMY.supplyCosts;

/**
 * Whether `unit` can be trained without exceeding `economy`'s supply cap.
 * Faction-agnostic — both the human UI and the AI player consult this.
 */
export function canTrain(economy: GameEconomy, unit: UnitType): boolean {
  return economy.usedSupply + supplyCostFor(unit) <= economy.maxSupply;
}

/** Recompute a faction's supply cap from its list of complete buildings. */
export function recomputeMaxSupply(economy: GameEconomy, buildings: BuildingType[]): void {
  economy.maxSupply = buildings.reduce((sum, b) => sum + buildingSupplyFor(b), 0);
}

/** How many peons each House supports. */
const PEONS_PER_HOUSE = 3;
/** How many peons each Granary supports (storage feeds workers). */
const PEONS_PER_GRANARY = 2;
/** Peons supported with no Houses or Granaries — the Town Hall's base capacity. */
const BASE_PEON_CAP = 4;

/**
 * The peon cap for a faction — how many peons it may field. Equal to a base
 * capacity (the Town Hall) plus the contribution of every complete House and
 * Granary. Caps peon spam and ties economy scale to construction (spec 101).
 */
export function peonCap(houseCount: number, granaryCount: number): number {
  return BASE_PEON_CAP + houseCount * PEONS_PER_HOUSE + granaryCount * PEONS_PER_GRANARY;
}

/** Whether a faction may add another peon, given its current peon count + cap. */
export function canAddPeon(currentPeons: number, houseCount: number, granaryCount: number): boolean {
  return currentPeons < peonCap(houseCount, granaryCount);
}
