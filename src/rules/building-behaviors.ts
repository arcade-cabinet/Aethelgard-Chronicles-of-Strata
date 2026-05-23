import type { BuildingType } from '@/ecs/components';

/**
 * Behaviour profile for a building type — which local-zone-of-control
 * archetypes it composes, with their parameters (spec 102). Behaviours are
 * orthogonal traits, not type-coupled logic, so a future building (e.g. a
 * Wonder) can compose all three; a Town Hall variant could add offence; etc.
 */
export interface BuildingBehaviorProfile {
  offensive?: { radius: number; dps: number };
  defensive?: { radius: number };
  attractor?: { radius: number };
}

/** Map each building type to its composed behaviours. */
export const BUILDING_BEHAVIORS: Record<BuildingType, BuildingBehaviorProfile> = {
  TownHall: { attractor: { radius: 2 } },
  Farm: {},
  House: {},
  Granary: {},
  Barracks: {},
  Watchtower: { offensive: { radius: 3, dps: 6 } },
  Wall: { defensive: { radius: 0 } },
};

/** Resolve a building type's behaviour profile. */
export function behaviorsFor(type: BuildingType): BuildingBehaviorProfile {
  return BUILDING_BEHAVIORS[type];
}
