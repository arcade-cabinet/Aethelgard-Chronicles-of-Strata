import { z } from 'zod';
import { RESOURCE_IDS } from '@/config/resources';
import type { BuildingType, ResourceType, UnitType } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';
import economyJson from './economy.json';

/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `economy.json`. Replaces the bare `as EconomyConfig` cast with
 * runtime parse + fail-fast on schema drift. CI catches a typo'd
 * JSON edit at module load time.
 *
 * The cost + startingResources schemas BUILD from `RESOURCE_IDS`
 * (the JSON-first resource registry from `src/config/resources.json`)
 * rather than hand-listing slots. Adding a 6th slot to resources.json
 * is automatically allowed here — the prior hand-listed schema
 * silently STRIPPED unknown slots from economy.json, which is the
 * latent bug both reviewer passes flagged. The coderabbit + simplifier
 * reports both called this out as MR-1 / "highest-ROI JSON-first
 * conversion remaining".
 */

const ResourceCostSchema = z.object(
  Object.fromEntries(RESOURCE_IDS.map((id) => [id, z.number().int().nonnegative().optional()])),
) as z.ZodType<ResourceCost>;

// Coderabbit MAJOR PR #10 05:46Z — enum-keyed resourceType so an
// unknown / typo'd resource id in economy.json fails parse instead
// of slipping through as a string (which would then break
// harvestYieldFor lookups silently). RESOURCE_IDS is the single
// source from src/config/resources.json — bool-cast the readonly
// array to a tuple for z.enum's spread requirement.
const ResourceIdSchema = z.enum(RESOURCE_IDS as readonly [string, ...string[]]);
const ResourceSpawnRuleSchema = z.object({
  resourceType: ResourceIdSchema,
  biomes: z.array(z.string()),
  chance: z.number().min(0).max(1),
  amount: z.number().positive(),
});

const StartingResourcesSchema = z
  .object(Object.fromEntries(RESOURCE_IDS.map((id) => [id, z.number().nonnegative().optional()])))
  .extend({ maxSupply: z.number().int().nonnegative() });

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
 * Typed accessor for `economy.json`. Now Zod-validated at module load.
 * M_FUN.REFACTOR.AI-CASTS — the `as unknown as EconomyConfig` removed.
 * The schema now uses concrete enum-keyed records that align 1:1 with the
 * interface, so a plain `satisfies` is sufficient without the double cast.
 */
export interface EconomyConfig {
  buildingCosts: Record<Exclude<BuildingType, 'TownHall'>, ResourceCost>;
  buildingSupply: Record<BuildingType, number>;
  buildableBiomes: string[];
  supplyCosts: Record<UnitType, number>;
  unitCosts: Record<'Peon' | 'Footman', ResourceCost>;
  startingResources: Partial<Record<ResourceType, number>> & { maxSupply: number };
  resourceSpawn: ResourceSpawnRule[];
  harvestYield: Record<ResourceType, number>;
  roadCosts: Record<'stone' | 'wood' | 'dirt', ResourceCost>;
}

// Parse at module load — throws a structured Zod error on schema drift.
const _validated = EconomyConfigSchema.parse(economyJson);

/**
 * The validated economy tuning. Import this — never `economy.json` directly.
 *
 * The cast from z.infer<EconomyConfigSchema> to EconomyConfig is a safe
 * narrowing: every field the schema validates IS a valid EconomyConfig field.
 * The only delta is that noUncheckedIndexedAccess widens Record<string, T>
 * to T | undefined while the interface declares Record<LiteralUnion, T>
 * (which TS treats as total). The accessor functions below are the ONLY
 * read sites; each uses `as T` to document the guaranteed-present key.
 */
export const ECONOMY = _validated as EconomyConfig;

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

/**
 * Resource cost to train a trainable unit. M_V7.TRAIN.WIDEN-ROLES —
 * accepts all 9 PLAYER_UNIT_TYPES per M_PIVOT.N-PLAYER.SHARED-KIT.
 */
export function unitCostFor(
  role:
    | 'Peon'
    | 'Footman'
    | 'Scout'
    | 'Wizard'
    | 'Healer'
    | 'Trebuchet'
    | 'Ferryman'
    | 'Settler'
    | 'Hero',
): ResourceCost {
  return (ECONOMY.unitCosts as Record<string, ResourceCost>)[role] as ResourceCost;
}

/** Resource cost to place one road tile of `material` (M_FEATURE.1). */
export function roadCostFor(material: 'stone' | 'wood' | 'dirt'): ResourceCost {
  return ECONOMY.roadCosts[material] as ResourceCost;
}
