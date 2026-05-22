import type { BuildingType, UnitType } from '@/ecs/components';
import { BUILDING_SUPPLY } from './build';
import type { GameEconomy } from './economy';

/** Supply each trainable unit consumes. Enemies are not supply-tracked. */
export const SUPPLY_COST: Record<UnitType, number> = {
  Peon: 1,
  Footman: 2,
  Goblin: 0,
  Orc: 0,
};

/** Whether a unit can be trained without exceeding the supply cap. */
export function canTrain(economy: GameEconomy, unit: UnitType): boolean {
  return economy.usedSupply + SUPPLY_COST[unit] <= economy.maxSupply;
}

/** Recompute the supply cap from the list of owned (complete) buildings. */
export function recomputeMaxSupply(economy: GameEconomy, buildings: BuildingType[]): void {
  economy.maxSupply = buildings.reduce((sum, b) => sum + BUILDING_SUPPLY[b], 0);
}
