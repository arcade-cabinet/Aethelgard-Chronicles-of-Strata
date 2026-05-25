import { ECONOMY } from '@/config/economy';
import { RESOURCE_TYPES, type ResourceType } from '@/ecs/components';

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
  /**
   * M_EXPANSION.F.72 — Mana, the 4th non-supply resource slot. Drives
   * Wizard training cost + (future) magic-spell ability budgets. Starts
   * at 0 like science; trickles up passively + faster with future
   * mana-producing buildings (Library v2 / Crystal Shrine).
   */
  mana: number;
  /** Current supply consumed by units. */
  usedSupply: number;
  /** Supply cap — sum of owned buildings' supply contribution. */
  maxSupply: number;
  /**
   * M_EXPANSION.U.122 — peak usedSupply across the whole match. Bumped
   * every tick where usedSupply exceeds the prior peak; surfaces in
   * the post-match stats screen. Defaults to 0.
   */
  peakSupply: number;
  /** Enemy units killed this session. */
  kills: number;
  /**
   * M_FUN.QA.AIVAI.ZONE-BREAKDOWN (v0.5.B) — kills classified by
   * zone-of-control class at the kill location:
   *   skirmish     — neutral tile (neither faction's zone)
   *   encroachment — tile in OPPONENT's zone (attacking)
   *   assault      — tile within 3 hexes of opponent's faction base
   * Sums to `kills`. Lets the balance harness assert "this AI
   * engages everywhere" vs "this AI only assaults" per personality.
   */
  killsByZone: {
    skirmish: number;
    encroachment: number;
    assault: number;
  };
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
    // M_EXPANSION.F.72 — mana starts at 0 by default; the config can
    // override with a non-zero seed for a "wizard-start" preset.
    mana: s.mana ?? 0,
    usedSupply: 0,
    maxSupply: s.maxSupply,
    peakSupply: 0,
    kills: 0,
    killsByZone: { skirmish: 0, encroachment: 0, assault: 0 },
  };
}

/**
 * Add `amount` to an economy slot. Negative inputs are clamped to 0 — a
 * production code path should never add negative resources, and silently
 * minting via subtraction would be a bug, not a feature.
 */
export function addResource(eco: GameEconomy, type: ResourceType, amount: number): void {
  if (amount <= 0) return;
  eco[type] += amount;
}

/**
 * Whether the economy can pay every slot in `cost`. Negative cost entries
 * are treated as 0 — a Discovery / building can't grant resources via
 * affordability checks. Slot-iterating — adding a 4th slot needs no change.
 */
export function canAfford(eco: GameEconomy, cost: ResourceCost): boolean {
  for (const slot of RESOURCE_TYPES) {
    const need = Math.max(0, cost[slot] ?? 0);
    if (eco[slot] < need) return false;
  }
  return true;
}

/**
 * Deduct every slot in `cost` if affordable. Returns whether the spend
 * succeeded. Negative cost entries deduct nothing (clamped to 0) — a cost
 * row is a one-way debit, never a sneaky credit.
 */
export function spend(eco: GameEconomy, cost: ResourceCost): boolean {
  if (!canAfford(eco, cost)) return false;
  for (const slot of RESOURCE_TYPES) {
    eco[slot] -= Math.max(0, cost[slot] ?? 0);
  }
  return true;
}

/** Current supply in use. */
export function supplyUsed(eco: GameEconomy): number {
  return eco.usedSupply;
}
