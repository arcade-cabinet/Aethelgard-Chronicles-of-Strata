import { ECONOMY, buildingSupplyFor, supplyCostFor } from '@/config/economy';
import type { BuildingType, UnitType } from '@/ecs/components';
import type { GameEconomy } from './economy';

/** Supply each trainable unit consumes. Enemies are not supply-tracked. */
export const SUPPLY_COST: Record<UnitType, number> = ECONOMY.supplyCosts;

/** Whether a unit can be trained without exceeding the supply cap. */
export function canTrain(economy: GameEconomy, unit: UnitType): boolean {
  return economy.usedSupply + supplyCostFor(unit) <= economy.maxSupply;
}

/** Recompute the supply cap from the list of owned (complete) buildings. */
export function recomputeMaxSupply(economy: GameEconomy, buildings: BuildingType[]): void {
  economy.maxSupply = buildings.reduce((sum, b) => sum + buildingSupplyFor(b), 0);
}
