import type { ResourceType } from '@/ecs/components';

/** Global resource totals and supply for one play session. */
export interface GameEconomy {
  /** Wood total. */
  wood: number;
  /** Stone total. */
  stone: number;
  /** Gold total. */
  gold: number;
  /** Current supply consumed by units. */
  usedSupply: number;
  /** Supply cap — sum of owned buildings' supply contribution. */
  maxSupply: number;
  /** Enemy units killed this session. */
  kills: number;
}

/** A resource cost for training a unit or placing a building. */
export interface ResourceCost {
  /** Wood required. */
  wood: number;
  /** Stone required. */
  stone: number;
  /** Gold required. */
  gold: number;
}

/** Create the opening economy. TownHall provides 5 supply at game start. */
export function createEconomy(): GameEconomy {
  return { wood: 50, stone: 20, gold: 20, usedSupply: 0, maxSupply: 5, kills: 0 };
}

/** Add an amount of a resource to the economy. */
export function addResource(eco: GameEconomy, type: ResourceType, amount: number): void {
  eco[type] += amount;
}

/** Whether the economy can pay a cost. */
export function canAfford(eco: GameEconomy, cost: ResourceCost): boolean {
  return eco.wood >= cost.wood && eco.stone >= cost.stone && eco.gold >= cost.gold;
}

/** Deduct a cost if affordable. Returns whether the spend succeeded. */
export function spend(eco: GameEconomy, cost: ResourceCost): boolean {
  if (!canAfford(eco, cost)) return false;
  eco.wood -= cost.wood;
  eco.stone -= cost.stone;
  eco.gold -= cost.gold;
  return true;
}

/** Current supply in use. */
export function supplyUsed(eco: GameEconomy): number {
  return eco.usedSupply;
}
