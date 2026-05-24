import { z } from 'zod';
import type { BuildingType, ResourceType, UnitType } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';
import economyJson from './economy.json';

/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `economy.json`. Replaces the bare `as EconomyConfig` cast with
 * runtime parse + fail-fast on schema drift. CI catches a typo'd
 * JSON edit at module load time.
 */

// ResourceCost is a Partial<Record<ResourceType, number>> in game
// code — every key optional. Building rows specify only what they
// cost ({wood:60} House; {stone:60} Wall etc).
const ResourceCostSchema = z.object({
  wood: z.number().int().nonnegative().optional(),
  stone: z.number().int().nonnegative().optional(),
  gold: z.number().int().nonnegative().optional(),
  science: z.number().int().nonnegative().optional(),
  mana: z.number().int().nonnegative().optional(),
});

const ResourceSpawnRuleSchema = z.object({
  resourceType: z.string(),
  biomes: z.array(z.string()),
  chance: z.number().min(0).max(1),
  amount: z.number().positive(),
});

const StartingResourcesSchema = z.object({
  wood: z.number().nonnegative(),
  stone: z.number().nonnegative(),
  gold: z.number().nonnegative(),
  science: z.number().nonnegative(),
  /** M_EXPANSION.F.72 — optional mana; defaults to 0 elsewhere. */
  mana: z.number().nonnegative().optional(),
  maxSupply: z.number().int().nonnegative(),
});

const EconomyConfigSchema = z.object({
  buildingCosts: z.record(z.string(), ResourceCostSchema),
  buildingSupply: z.record(z.string(), z.number().nonnegative()),
  buildableBiomes: z.array(z.string()).min(1),
  supplyCosts: z.record(z.string(), z.number().int().nonnegative()),
  unitCosts: z.record(z.string(), ResourceCostSchema),
  startingResources: StartingResourcesSchema,
  resourceSpawn: z.array(ResourceSpawnRuleSchema),
  // M_FUN.FOUNDATION.ZOD-CONFIG — science/mana yields = 0 (those
  // resources are produced by buildings, not peon harvest), so the
  // schema is nonnegative not positive.
  harvestYield: z.record(z.string(), z.number().nonnegative()),
  roadCosts: z.record(z.string(), ResourceCostSchema),
});

/** A resource node's spawn rule. */
export type ResourceSpawnRule = z.infer<typeof ResourceSpawnRuleSchema> & {
  resourceType: ResourceType;
};

/**
 * Typed accessor for `economy.json`. Same surface as before; now
 * Zod-validated at module load. The cross-reference between
 * `Record<keyof, ResourceCost>` and the JSON's open string keys is
 * done by typed accessor functions below — Zod can't fully express
 * 'every UnitType key MUST be present' without a partial allowlist
 * cycle, so the accessor functions still cast at the boundary.
 */
export interface EconomyConfig {
  buildingCosts: Record<Exclude<BuildingType, 'TownHall'>, ResourceCost>;
  buildingSupply: Record<BuildingType, number>;
  buildableBiomes: string[];
  supplyCosts: Record<UnitType, number>;
  unitCosts: Record<'Peon' | 'Footman', ResourceCost>;
  startingResources: {
    wood: number;
    stone: number;
    gold: number;
    science: number;
    mana?: number;
    maxSupply: number;
  };
  resourceSpawn: ResourceSpawnRule[];
  harvestYield: Record<ResourceType, number>;
  roadCosts: Record<'stone' | 'wood' | 'dirt', ResourceCost>;
}

// Parse at module load — throws a structured Zod error on schema drift.
const _validated = EconomyConfigSchema.parse(economyJson);

/** The validated economy tuning. Import this — never `economy.json` directly. */
export const ECONOMY: EconomyConfig = _validated as unknown as EconomyConfig;

// Typed accessors — the single place the total-key Records are read under
// `noUncheckedIndexedAccess`. The keys are guaranteed present in economy.json
// and covered by the config round-trip test.

/** Supply contributed by a building type. */
export function buildingSupplyFor(type: BuildingType): number {
  return ECONOMY.buildingSupply[type] as number;
}

/** Supply consumed by a unit role. */
export function supplyCostFor(role: UnitType): number {
  return ECONOMY.supplyCosts[role] as number;
}

/** Resource yielded per harvest cycle of a resource type. */
export function harvestYieldFor(type: ResourceType): number {
  return ECONOMY.harvestYield[type] as number;
}

/** Resource cost of a building type. */
export function buildingCostFor(type: Exclude<BuildingType, 'TownHall'>): ResourceCost {
  return ECONOMY.buildingCosts[type] as ResourceCost;
}

/** Resource cost to train a trainable unit. */
export function unitCostFor(role: 'Peon' | 'Footman' | 'Scout' | 'Wizard' | 'Hero'): ResourceCost {
  return (ECONOMY.unitCosts as Record<string, ResourceCost>)[role] as ResourceCost;
}

/** Resource cost to place one road tile of `material` (M_FEATURE.1). */
export function roadCostFor(material: 'stone' | 'wood' | 'dirt'): ResourceCost {
  return ECONOMY.roadCosts[material] as ResourceCost;
}
