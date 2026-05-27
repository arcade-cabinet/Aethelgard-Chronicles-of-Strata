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
import { SERIALIZED_TRAITS } from '@/ecs/serialized-traits';

// ---------------------------------------------------------------------------
// Registry — every trait that survives serialization.
//
// M_REGISTRY.25 — the trait list now lives on `SERIALIZED_TRAITS` in
// `@/ecs/components`. This module reads it directly; adding a new
// trait that should round-trip means adding ONE row in components.ts
// (next to the trait definition) — no parallel registry in persistence/.
// ---------------------------------------------------------------------------

const TRAIT_REGISTRY = SERIALIZED_TRAITS;

// biome-ignore lint/suspicious/noExplicitAny: trait name → factory map
const TRAIT_BY_NAME = new Map<string, any>(TRAIT_REGISTRY.map((e) => [e.name, e.traitObj]));

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
      // M_SEC.6 — reject prototype-pollution keys at the trait-name layer.
      // A snapshot containing `{ __proto__: {...}, constructor: {...} }`
      // would walk into Object.prototype via `Object.entries` (it doesn't,
      // but be explicit) AND the trait-name lookup must NOT silently match
      // an inherited Map key. TRAIT_BY_NAME.get returns undefined for
      // unknown / dangerous names, but the explicit reject documents intent.
      if (name === '__proto__' || name === 'constructor' || name === 'prototype') continue;
      const traitObj = TRAIT_BY_NAME.get(name);
      if (traitObj === undefined) continue;
      if (data === null || typeof data !== 'object') continue;
      // M_SEC.6 — trait payload is plain data, no nested __proto__ keys.
      // `Object.assign({}, data)` strips inherited keys and any setter
      // that would fire on a normal property assignment in koota's
      // schema initializer. Trait factories accept partial data and
      // fill defaults; rejecting unknown trait keys is koota's job.
      const sanitised: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        sanitised[k] = v;
      }
      initializers.push(traitObj(sanitised));
    }
    if (initializers.length > 0) {
      world.spawn(...initializers);
    }
  }

  return world;
}
