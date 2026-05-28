/**
 * world — the top-level world renderer barrel (M_V13.DECOMP.WORLD-BARREL).
 *
 * Re-exports every world feature sub-package so the whole r3f world
 * layer is reachable from a single `@/world` entry point. The v0.13
 * decomposition split the former 44-file flat directory into five
 * feature sub-packages, each with its own barrel:
 *
 *   biomes      biome identity: palette, swatches, mountains, decoration
 *   terrain     hex board mesh + interaction surface (roads, water, tap)
 *   board       entities on the board (units, structures, resources, FX rings)
 *   effects     particle/hazard FX + world-space text
 *   procedural  procedural building-mesh system (buildings + primitives)
 *
 * Internal consumers import the granular `@/world/<feature>` path
 * (tighter tree-shaking); this barrel is the external discoverability
 * entry point.
 */
export * from './biomes';
export * from './terrain';
export * from './board';
export * from './effects';
export * from './procedural';
