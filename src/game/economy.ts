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
/**
 * Per-slot accumulation totals. ALL resource slots from
 * `RESOURCE_TYPES` get a numeric field automatically. Adding a 6th
 * slot in `src/config/resources.json` flows through here without a
 * type edit (TS resolves the Record at compile time). No system
 * needs `if (slot === 'wood') ...` — iterate RESOURCE_TYPES.
 *
 * Active slots today:
 *   wood, stone, ore, gold, food, peat — harvested via Peon
 *   science, mana                       — passive trickle
 * See `src/config/resources.json` for source biomes + consumers
 * per slot. The `risks` field on a source carries the
 * decision-track shape (high yield + DoT or fatigue or both).
 */
export type ResourceTotals = Record<ResourceType, number>;

export interface GameEconomy extends ResourceTotals {
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
  const s: Partial<Record<ResourceType, number>> = ECONOMY.startingResources as Partial<
    Record<ResourceType, number>
  >;
  // Zero every resource slot; the JSON's startingResources block
  // overrides per-slot. A new slot added to resources.json defaults
  // to 0 here; if it needs a non-zero start, add a row to
  // economy.json#startingResources too — Zod will fail-fast at
  // load if the slot name typoes.
  const totals = {} as ResourceTotals;
  for (const slot of RESOURCE_TYPES) totals[slot] = s[slot] ?? 0;
  return {
    ...totals,
    usedSupply: 0,
    maxSupply: ECONOMY.startingResources.maxSupply,
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
