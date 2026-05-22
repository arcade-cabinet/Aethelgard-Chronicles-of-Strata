/**
 * ECS serialization — world ↔ JSON snapshot.
 *
 * `serializeWorld(world)` walks every entity in the world (enumerated by
 * querying each registered trait and deduplicating by koota `entityId`) and
 * captures all traits as JSON-safe data. `deserializeWorld(snapshot)` builds a
 * fresh koota world and re-spawns each entity with the stored data.
 *
 * The trait registry maps string names → trait objects. Serialization checks
 * `entity.has(Trait)` for each registered trait; if present, captures
 * `entity.get(Trait)`. Deserialization calls `Trait(data)` to produce the
 * koota initializer that `world.spawn` accepts.
 *
 * Source: docs/specs/95-persistence.md §ECS Snapshot
 */
import type { Entity, World } from 'koota';
import { createWorld, unpackEntity } from 'koota';
import {
  AnimationState,
  AssignedJob,
  Building,
  Carrier,
  Combatant,
  EnemyTarget,
  FactionTrait,
  GoblinPortalTrait,
  Harvester,
  Health,
  HexPosition,
  Movement,
  PathQueue,
  ResourceTrait,
  Selectable,
  Transform,
  Unit,
} from '@/ecs/components';

// ---------------------------------------------------------------------------
// Registry — every trait that survives serialization.
// ---------------------------------------------------------------------------

/** A single entry in the trait registry. */
interface TraitEntry {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: registry needs generic trait type
  traitObj: any;
}

const TRAIT_REGISTRY: TraitEntry[] = [
  { name: 'Transform', traitObj: Transform },
  { name: 'HexPosition', traitObj: HexPosition },
  { name: 'Unit', traitObj: Unit },
  { name: 'FactionTrait', traitObj: FactionTrait },
  { name: 'Movement', traitObj: Movement },
  { name: 'PathQueue', traitObj: PathQueue },
  { name: 'AnimationState', traitObj: AnimationState },
  { name: 'Selectable', traitObj: Selectable },
  { name: 'ResourceTrait', traitObj: ResourceTrait },
  { name: 'Harvester', traitObj: Harvester },
  { name: 'Carrier', traitObj: Carrier },
  { name: 'Building', traitObj: Building },
  { name: 'AssignedJob', traitObj: AssignedJob },
  { name: 'Health', traitObj: Health },
  { name: 'Combatant', traitObj: Combatant },
  { name: 'GoblinPortalTrait', traitObj: GoblinPortalTrait },
  { name: 'EnemyTarget', traitObj: EnemyTarget },
];

// biome-ignore lint/suspicious/noExplicitAny: trait name → factory map
const TRAIT_BY_NAME = new Map<string, any>(
  TRAIT_REGISTRY.map((e) => [e.name, e.traitObj]),
);

// ---------------------------------------------------------------------------
// Snapshot types
// ---------------------------------------------------------------------------

/** Serialized trait data for one entity. */
type EntitySnapshot = Record<string, unknown>;

/** The full serialized world snapshot. */
export interface WorldSnapshot {
  entities: EntitySnapshot[];
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Serialize the entire koota world to a JSON-safe snapshot. Each entity is
 * captured as a map of `{ [traitName]: data }` for each trait it carries.
 *
 * Entities are enumerated by querying each registered trait and deduplicating
 * by entityId (via `unpackEntity`).
 */
export function serializeWorld(world: World): WorldSnapshot {
  // Enumerate all entities: query each trait, deduplicate by entityId.
  const seenIds = new Set<number>();
  const allEntities: Entity[] = [];

  for (const { traitObj } of TRAIT_REGISTRY) {
    for (const entity of world.query(traitObj)) {
      const { entityId } = unpackEntity(entity);
      if (!seenIds.has(entityId)) {
        seenIds.add(entityId);
        allEntities.push(entity);
      }
    }
  }

  const entities: EntitySnapshot[] = allEntities.map((entity) => {
    const snap: EntitySnapshot = {};
    for (const { name, traitObj } of TRAIT_REGISTRY) {
      if (entity.has(traitObj)) {
        const data = entity.get(traitObj);
        if (data !== undefined) {
          snap[name] = { ...(data as object) };
        }
      }
    }
    return snap;
  });

  return { entities };
}

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/**
 * Deserialize a snapshot into a fresh koota world. Each entity is re-spawned
 * with the traits it carried, initializing each trait with the stored data.
 */
export function deserializeWorld(snapshot: WorldSnapshot): World {
  const world = createWorld();

  for (const snap of snapshot.entities) {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic trait construction
    const initializers: any[] = [];
    for (const [name, data] of Object.entries(snap)) {
      const traitObj = TRAIT_BY_NAME.get(name);
      if (traitObj !== undefined && data !== null && typeof data === 'object') {
        initializers.push(traitObj(data));
      }
    }
    if (initializers.length > 0) {
      world.spawn(...initializers);
    }
  }

  return world;
}
