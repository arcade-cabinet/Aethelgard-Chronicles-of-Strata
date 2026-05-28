/**
 * config — the top-level config barrel (M_V13.DECOMP.CONFIG-BARREL).
 *
 * Re-exports every config domain bundle so the whole tunables surface
 * is reachable from a single `@/config` entry point. The v0.13
 * decomposition split the former flat config dir into seven domain
 * bundles, each a json+ts(+barrel) sub-package:
 *
 *   economy      resource registry + economy tuning
 *   combat       combat tuning + unit/building archetypes
 *   progression  discoveries + meta-unlocks + eras
 *   ai           factions + faction palette + AI personalities
 *   world        world geometry/camera + mapgen rules
 *   narrative    myth events + credits + campaign chapters
 *   assets       asset bounding-box scale + rig metadata
 *
 * Internal consumers import the granular `@/config/<bundle>` path
 * (tighter tree-shaking); this barrel is the external discoverability
 * entry point. `schema` holds the shared Zod builders the bundles use.
 */
export * from './economy';
export * from './combat';
export * from './progression';
export * from './ai';
export * from './world';
export * from './narrative';
export * from './assets';
export * from './schema';
