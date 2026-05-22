import { RESOURCE_TYPES, type ResourceType } from '@/ecs/components';
import { ECONOMY } from '@/config/economy';

/**
 * Global resource totals + supply + kills for one play session.
 *
 * The `wood`/`stone`/`gold` fields are the three current ECONOMIC SLOTS
 * (spec 102 + M_DATA.6). Iterate via `RESOURCE_TYPES`, never by name —
 * adding a 4th slot is one config row + one ResourceType union entry +
 * one GameEconomy field; no system needs `if (slot === 'wood') ...`.
 */
export interface GameEconomy {
  /** Wood total — accumulation slot. */
  wood: number;
  /** Stone total — accumulation slot. */
  stone: number;
  /** Gold total — accumulation slot. */
  gold: number;
  /**
   * Science total — accumulation slot. Spent on Discoveries (the tech tree
   * archetype, M_DATA.7). Accumulates passively over time + faster with
   * science-producing buildings.
   */
  science: number;
  /** Current supply consumed by units. */
  usedSupply: number;
  /** Supply cap — sum of owned buildings' supply contribution. */
  maxSupply: number;
  /** Enemy units killed this session. */
  kills: number;
}

/**
 * A resource cost — a map of slot → amount. A cost omits slots it does not
 * consume (treated as 0). Validated + spent by iterating `RESOURCE_TYPES`,
 * NOT by hardcoded `cost.wood + cost.stone + cost.gold`.
 */
export type ResourceCost = Partial<Record<ResourceType, number>>;

/** Create the opening economy from the starting-resources config. */
export function createEconomy(): GameEconomy {
  const s = ECONOMY.startingResources;
  return {
    wood: s.wood,
    stone: s.stone,
    gold: s.gold,
    science: s.science,
    usedSupply: 0,
    maxSupply: s.maxSupply,
    kills: 0,
  };
}

/** Add `amount` to an economy slot. */
export function addResource(eco: GameEconomy, type: ResourceType, amount: number): void {
  eco[type] += amount;
}

/**
 * Whether the economy can pay every slot in `cost`. Slot-iterating — adding a
 * 4th slot needs no change here.
 */
export function canAfford(eco: GameEconomy, cost: ResourceCost): boolean {
  for (const slot of RESOURCE_TYPES) {
    const need = cost[slot] ?? 0;
    if (eco[slot] < need) return false;
  }
  return true;
}

/** Deduct every slot in `cost` if affordable. Returns whether the spend succeeded. */
export function spend(eco: GameEconomy, cost: ResourceCost): boolean {
  if (!canAfford(eco, cost)) return false;
  for (const slot of RESOURCE_TYPES) {
    eco[slot] -= cost[slot] ?? 0;
  }
  return true;
}

/** Current supply in use. */
export function supplyUsed(eco: GameEconomy): number {
  return eco.usedSupply;
}
