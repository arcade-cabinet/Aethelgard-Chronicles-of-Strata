import type { BuildingType, ResourceType, UnitType } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';
import economyJson from './economy.json';

/** A resource node's spawn rule. */
export interface ResourceSpawnRule {
  /** Which resource this node yields. */
  resourceType: ResourceType;
  /** Biome type names the node may spawn on. */
  biomes: string[];
  /** Per-eligible-tile spawn probability. */
  chance: number;
  /** Starting resource amount in the node. */
  amount: number;
}

/**
 * Typed accessor for `economy.json` — building costs, supply, starting
 * resources, research costs, resource spawning, and harvest yields. The JSON is
 * asserted to this shape exactly once, here; consumers import the typed
 * `ECONOMY` object instead of re-declaring partial interfaces per module.
 */
export interface EconomyConfig {
  /** Resource cost to construct each player building. */
  buildingCosts: Record<Exclude<BuildingType, 'TownHall'>, ResourceCost>;
  /** Supply capacity each building contributes. */
  buildingSupply: Record<BuildingType, number>;
  /** Biome type names a building may be placed on. */
  buildableBiomes: string[];
  /** Supply each unit role consumes. */
  supplyCosts: Record<UnitType, number>;
  /** Resource cost to TRAIN each trainable unit (Peon at Town Hall, Footman at Barracks). */
  unitCosts: Record<'Peon' | 'Footman', ResourceCost>;
  /** The economy a fresh game starts with. */
  startingResources: {
    /** Starting wood. */
    wood: number;
    /** Starting stone. */
    stone: number;
    /** Starting gold. */
    gold: number;
    /** Starting science. */
    science: number;
    /** Starting supply cap. */
    maxSupply: number;
  };
  /** Resource-node spawn rules. */
  resourceSpawn: ResourceSpawnRule[];
  /** Resource yielded per completed harvest cycle. */
  harvestYield: Record<ResourceType, number>;
}

/** The validated economy tuning. Import this — never `economy.json` directly. */
export const ECONOMY: EconomyConfig = economyJson as EconomyConfig;

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
export function unitCostFor(role: 'Peon' | 'Footman'): ResourceCost {
  return ECONOMY.unitCosts[role] as ResourceCost;
}
