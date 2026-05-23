import type { BuildingType, UnitType } from '@/ecs/components';

/**
 * Display + behavior metadata per building type — the SINGLE source the HUD
 * reads to render labels, descriptions, action lists, and gating. Adding a
 * building type means adding a row HERE; the SelectionPanel does not need
 * to know any building-specific names or branches.
 *
 * Architectural rule (per the user's call-out): config + archetype tables
 * drive HUD text/visuals, not type-coupled `if (isTownHall)` branches.
 * See spec 102 — composition algebra; HUD is just a view over the data.
 */
export interface BuildingDisplay {
  /** Player-facing name. */
  name: string;
  /** One-line description (used as a tooltip + onboarding hint). */
  description: string;
  /** Which trainable unit (if any) this building produces. */
  trains?: 'Peon' | 'Footman';
  /** Whether the building can purchase research (TownHall+Barracks today). */
  research?: ReadonlyArray<'forgedBlades' | 'steelPlows'>;
  /** Whether the building offers a "set rally point" interaction. */
  hasRally?: boolean;
  /** Whether the building's selection-panel surfaces the build menu. */
  showsBuildMenu?: boolean;
}

/** Per-building display + interaction metadata. Add a row to add a building. */
export const BUILDING_DISPLAY: Record<BuildingType, BuildingDisplay> = {
  TownHall: {
    name: 'Town Hall',
    description: 'Your home base. Anchors the kingdom and trains peons.',
    trains: 'Peon',
    showsBuildMenu: true,
  },
  Farm: {
    name: 'Farm',
    description: 'Raises your supply cap so you can field more units.',
  },
  House: {
    name: 'House',
    description: 'Increases your peon cap — train more workers.',
  },
  Granary: {
    name: 'Granary',
    description: 'Storage that supports additional peons.',
  },
  Barracks: {
    name: 'Barracks',
    description: 'Trains Footmen and unlocks military research.',
    trains: 'Footman',
    research: ['forgedBlades', 'steelPlows'],
    hasRally: true,
  },
  Watchtower: {
    name: 'Watchtower',
    description: 'Shoots intruders within its zone — a defensive emitter.',
  },
  Wall: {
    name: 'Wall',
    description: 'A hard pathing border. Enemies cannot cross it.',
  },
  Wonder: {
    name: 'Wonder',
    description: 'Composes all 3 archetypes — attractor + offensive + defensive.',
  },
  Library: {
    name: 'Library',
    description: 'Produces science over time — fuels Discoveries.',
  },
};

/** Resolve the display metadata for a building type. */
export function displayFor(type: BuildingType): BuildingDisplay {
  return BUILDING_DISPLAY[type];
}

/**
 * The unit roles a player may train, derived from BUILDING_DISPLAY's `trains`
 * fields — NOT hardcoded. Adding a trainer building adds the unit automatically.
 */
export function trainableUnits(): ReadonlyArray<'Peon' | 'Footman'> {
  const set = new Set<'Peon' | 'Footman'>();
  for (const d of Object.values(BUILDING_DISPLAY)) if (d.trains) set.add(d.trains);
  return [...set];
}

/** The building type that trains `unit`, or null. */
export function trainerFor(unit: UnitType): BuildingType | null {
  for (const [type, d] of Object.entries(BUILDING_DISPLAY)) {
    if (d.trains === unit) return type as BuildingType;
  }
  return null;
}
