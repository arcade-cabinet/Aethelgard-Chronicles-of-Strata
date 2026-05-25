import { buildingSupplyFor, ECONOMY, supplyCostFor, unitCostFor } from '@/config/economy';
import type { BuildingType, UnitType } from '@/ecs/components';
import { canAfford, type GameEconomy, type ResourceCost } from '@/game/economy';

/** Supply each trainable unit consumes. Enemies are not supply-tracked. */
export const SUPPLY_COST: Record<UnitType, number> = ECONOMY.supplyCosts;

/**
 * Resource cost to train a trainable unit. The set of keys is the
 * trainable-unit subset of UnitType; widening as new trainable units
 * land only requires adding the row to economy.json + the union here.
 *
 * M_V7.TRAIN.WIDEN-ROLES — extended from the v0.4 5-role union
 * (Peon/Footman/Scout/Wizard/Hero) to all 9 PLAYER_UNIT_TYPES per
 * M_PIVOT.N-PLAYER.SHARED-KIT. Without this, the SHARED-KIT contract
 * was a spec lie — Trebuchet/Wizard/Healer/Ferryman/Settler couldn't
 * be trained via the build command at all.
 */
export type TrainableUnit =
  | 'Peon'
  | 'Footman'
  | 'Scout'
  | 'Wizard'
  | 'Healer'
  | 'Trebuchet'
  | 'Ferryman'
  | 'Settler'
  | 'Hero';
export const UNIT_COSTS: Record<TrainableUnit, ResourceCost> = ECONOMY.unitCosts as Record<
  TrainableUnit,
  ResourceCost
>;

/**
 * Whether `unit` can be trained without exceeding `economy`'s supply cap.
 * Supply-only check (older signature kept for back-compat).
 */
export function canTrain(economy: GameEconomy, unit: UnitType): boolean {
  return economy.usedSupply + supplyCostFor(unit) <= economy.maxSupply;
}

/**
 * Whether a trainable unit can be trained right now — supply cap AND
 * resource cost AND (for Peons) the peon cap. The single legality check the
 * human UI greys buttons on AND the AI's TrainEvaluator consults.
 */
export function canTrainComplete(
  economy: GameEconomy,
  unit: TrainableUnit,
  peonCount: number,
  houseCount: number,
  granaryCount: number,
): boolean {
  if (!canTrain(economy, unit)) return false;
  if (!canAfford(economy, unitCostFor(unit))) return false;
  // Peons are also capped by Houses + Granaries
  if (unit === 'Peon' && !canAddPeon(peonCount, houseCount, granaryCount)) return false;
  return true;
}

/**
 * Recompute a faction's supply cap from its list of complete
 * buildings. M_EXPANSION.F.86 — buildings may carry a `tier` (1, 2,
 * or 3); supply scales linearly by tier so a tier-3 House yields
 * 3× the supply cap of a tier-1 House. Backward-compat: a plain
 * BuildingType (no tier info) is treated as tier 1.
 */
export interface BuildingTierRow {
  type: BuildingType;
  tier?: number;
}
/**
 * M_FUN.QA.AIVAI.TUNE — baseline supply cap (House-less). Without
 * this, recomputeMaxSupply would zero out the cap for a faction
 * with no completed buildings, blocking the AI from ever training
 * a Peon to build the House that lifts the cap. The baseline
 * matches ECONOMY.startingResources.maxSupply so both factions
 * can field the starting kit at t=0.
 */
// Coderabbit MAJOR — source of truth = ECONOMY.startingResources.
// Magic-number drift between this constant and the config would
// silently break the t=0 supply contract.
const BASELINE_SUPPLY_CAP = ECONOMY.startingResources.maxSupply;

export function recomputeMaxSupply(
  economy: GameEconomy,
  buildings: ReadonlyArray<BuildingType | BuildingTierRow>,
): void {
  let total = BASELINE_SUPPLY_CAP;
  for (const b of buildings) {
    if (typeof b === 'string') {
      total += buildingSupplyFor(b);
    } else {
      const tier = Math.max(1, b.tier ?? 1);
      total += buildingSupplyFor(b.type) * tier;
    }
  }
  economy.maxSupply = total;
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
export function canAddPeon(
  currentPeons: number,
  houseCount: number,
  granaryCount: number,
): boolean {
  return currentPeons < peonCap(houseCount, granaryCount);
}
