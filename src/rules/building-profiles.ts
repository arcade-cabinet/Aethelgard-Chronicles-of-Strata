/**
 * M_REGISTRY.5 — **the first proof of the unified Thing registry**.
 *
 * Before this file, eight separate per-BuildingType tables existed across
 * five modules — `BUILDING_BEHAVIORS` (zone-of-control archetypes),
 * `BUILDING_DISPLAY` (HUD strings + interaction flags), `economy.json`'s
 * `buildingCosts` + `buildingSupply`, the `Library` → `ScienceProducer`
 * conditional in `commands.ts:160`, and the per-faction mesh tables in
 * `structure-models.ts`. Each table was its own parallel hierarchy
 * indexed by `BuildingType` and each branched on type inside its
 * consumer.
 *
 * `BUILDING_PROFILES` collapses the five behaviour/economy/HUD tables
 * (everything EXCEPT the per-faction meshes, which belong to a Skin slot
 * tracked under M_REGISTRY.3) into ONE record. A new building type means
 * ONE row in ONE file, not five edits across five files. Consumers read
 * named slots; the type-coupled `if (type === 'Library')` branches in
 * `commands.ts:160` and `recomputeMaxSupply` collapse into uniform slot
 * iteration.
 *
 * Spec 102 (composition algebra) anticipated this — Wonder already
 * carries attractor + offensive + defensive simultaneously. Library now
 * declares `producer: { kind: 'science', rate: 1 }` as a peer of the
 * ZoC archetypes. Adding a Workshop that produces Gold becomes
 * `producer: { kind: 'gold', rate: 1 }` and the spawn site, supply tick,
 * and HUD pick it up without code changes.
 *
 * Per the M_ARCH_UNIFY keystone (directive §M_ARCH_UNIFY), buildings,
 * units, and props are all **Things** assembled from archetype slot
 * values. This file is the building-type Thing registry. Unit profiles
 * (M_REGISTRY.1) and resource profiles will land beside it.
 */
import type { BuildingType, UnitType } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';
import type { BuildingBehaviorProfile } from './building-behaviors';

/**
 * Producer slot — a building that emits a continuous resource stream on
 * the economy tick. `kind` names the resource; `rate` is units/second.
 * Used by `system-science.ts` (kind: 'science') today; future buildings
 * (a Mint with kind: 'gold', a Sawmill with kind: 'wood') drop in here
 * without touching commands.ts.
 */
export interface ProducerSlot {
  /** Which resource this building emits per tick. */
  kind: 'science' | 'wood' | 'stone' | 'gold';
  /** Resource units emitted per second. */
  rate: number;
}

/**
 * HUD slot — display + interaction metadata the SelectionPanel + HUD
 * read for the building. Was `BuildingDisplay` in `display.ts` — same
 * shape, now nested.
 */
export interface DisplaySlot {
  /** Player-facing name. */
  name: string;
  /** One-line description. */
  description: string;
  /** Which trainable unit (if any) this building produces. */
  trains?: 'Peon' | 'Footman';
  /** Which research IDs may be purchased here. */
  research?: ReadonlyArray<'forgedBlades' | 'steelPlows'>;
  /** Whether the building offers a "set rally point" interaction. */
  hasRally?: boolean;
  /** Whether the building's selection-panel surfaces the build menu. */
  showsBuildMenu?: boolean;
}

/**
 * Unified per-BuildingType profile. Every slot is optional except for
 * `display` (the HUD always needs a name + description) — uninstantiated
 * slots cleanly indicate "this building does not have that capability".
 */
export interface BuildingProfile {
  /** Local-zone-of-control archetypes (spec 102) — was BUILDING_BEHAVIORS. */
  behaviors: BuildingBehaviorProfile;
  /** HUD-facing strings + interaction flags — was BUILDING_DISPLAY. */
  display: DisplaySlot;
  /** Construction cost in resources. TownHall has none (starts in world). */
  cost?: ResourceCost;
  /** Supply cap contributed when complete. */
  supply: number;
  /** Per-tick resource production (M_REGISTRY.5 — was Library if-branch). */
  producer?: ProducerSlot;
}

/**
 * The master Thing registry for buildings. Add a building type by
 * adding a row here; the dependent surfaces (HUD, AI placement,
 * economy tick, supply recompute) pick it up automatically.
 */
export const BUILDING_PROFILES: Record<BuildingType, BuildingProfile> = {
  TownHall: {
    behaviors: { attractor: { radius: 2 } },
    display: {
      name: 'Town Hall',
      description: 'Your home base. Anchors the kingdom and trains peons.',
      trains: 'Peon',
      showsBuildMenu: true,
    },
    // No cost — TownHall is the starting structure, placed by startGame.
    supply: 5,
  },
  Farm: {
    behaviors: {},
    display: {
      name: 'Farm',
      description: 'Raises your supply cap so you can field more units.',
    },
    cost: { wood: 100, stone: 0, gold: 50 },
    supply: 10,
  },
  House: {
    behaviors: {},
    display: {
      name: 'House',
      description: 'Increases your peon cap — train more workers.',
    },
    cost: { wood: 60, stone: 0, gold: 0 },
    supply: 4,
  },
  Granary: {
    behaviors: {},
    display: {
      name: 'Granary',
      description: 'Storage that supports additional peons.',
    },
    cost: { wood: 80, stone: 40, gold: 0 },
    supply: 2,
  },
  Barracks: {
    behaviors: {},
    display: {
      name: 'Barracks',
      description: 'Trains Footmen and unlocks military research.',
      trains: 'Footman',
      research: ['forgedBlades', 'steelPlows'],
      hasRally: true,
    },
    cost: { wood: 150, stone: 100, gold: 50 },
    supply: 0,
  },
  Watchtower: {
    behaviors: { offensive: { radius: 3, dps: 6 } },
    display: {
      name: 'Watchtower',
      description: 'Shoots intruders within its zone — a defensive emitter.',
    },
    cost: { wood: 80, stone: 120, gold: 0 },
    supply: 0,
  },
  Wall: {
    behaviors: { defensive: { radius: 0 } },
    display: {
      name: 'Wall',
      description: 'A hard pathing border. Enemies cannot cross it.',
    },
    cost: { wood: 0, stone: 60, gold: 0 },
    supply: 0,
  },
  Wonder: {
    behaviors: {
      attractor: { radius: 3 },
      offensive: { radius: 4, dps: 8 },
      defensive: { radius: 0 },
    },
    display: {
      name: 'Wonder',
      description: 'Composes all 3 archetypes — attractor + offensive + defensive.',
    },
    cost: { wood: 500, stone: 400, gold: 300 },
    supply: 5,
  },
  Library: {
    behaviors: {},
    display: {
      name: 'Library',
      description: 'Produces science over time — fuels Discoveries.',
    },
    cost: { wood: 120, stone: 60, gold: 80 },
    supply: 0,
    // M_REGISTRY.5 — was the `type === 'Library'` branch in commands.ts:160.
    producer: { kind: 'science', rate: 1 },
  },
};

/** Resolve the full profile for a building type. */
export function profileFor(type: BuildingType): BuildingProfile {
  return BUILDING_PROFILES[type];
}

/**
 * The unit roles a player may train, derived from BUILDING_PROFILES.display
 * `trains` fields — NOT hardcoded. Adding a trainer building adds the unit
 * automatically.
 */
export function trainableUnits(): ReadonlyArray<'Peon' | 'Footman'> {
  const set = new Set<'Peon' | 'Footman'>();
  for (const p of Object.values(BUILDING_PROFILES)) if (p.display.trains) set.add(p.display.trains);
  return [...set];
}

/** The building type that trains `unit`, or null. */
export function trainerFor(unit: UnitType): BuildingType | null {
  for (const [type, p] of Object.entries(BUILDING_PROFILES)) {
    if (p.display.trains === unit) return type as BuildingType;
  }
  return null;
}
