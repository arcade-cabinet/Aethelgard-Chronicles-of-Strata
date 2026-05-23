/**
 * Behaviour profile for a building type — which local-zone-of-control
 * archetypes it composes (spec 102). The TYPE lives here; the per-
 * building VALUES live in `BUILDING_PROFILES[type].behaviors`
 * (M_REGISTRY.5). Splitting type and value resolves the import cycle
 * (profile needs the type; this file needs the registry for the
 * accessor) — the value-shaped import is one-way: behaviors-this-file →
 * profiles-the-registry.
 */
import type { BuildingType } from '@/ecs/components';
import { BUILDING_PROFILES } from './building-profiles';

/** Zone-of-control archetype composition for one building. */
export interface BuildingBehaviorProfile {
  offensive?: { radius: number; dps: number };
  defensive?: { radius: number };
  attractor?: { radius: number };
}

/** Resolve a building type's behaviour profile via the unified registry. */
export function behaviorsFor(type: BuildingType): BuildingBehaviorProfile {
  return BUILDING_PROFILES[type].behaviors;
}
