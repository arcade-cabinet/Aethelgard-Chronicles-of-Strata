/**
 * Building display metadata — type re-export + accessor.
 *
 * M_REGISTRY.5 — the `BUILDING_DISPLAY` table moved into
 * `BUILDING_PROFILES[type].display`. This file now publishes the legacy
 * `BuildingDisplay` type alias (some callers depend on it) and the
 * accessor that resolves a building type → display slot via the unified
 * registry. `trainableUnits` + `trainerFor` moved to `building-profiles`
 * for the same reason — they're derived from the registry, not a separate
 * table.
 */
import type { BuildingType } from '@/ecs/components';
import { BUILDING_PROFILES, type DisplaySlot } from './building-profiles';

/** Alias kept for back-compat with existing imports. */
export type BuildingDisplay = DisplaySlot;

/** Resolve the display metadata for a building type. */
export function displayFor(type: BuildingType): BuildingDisplay {
  return BUILDING_PROFILES[type].display;
}
