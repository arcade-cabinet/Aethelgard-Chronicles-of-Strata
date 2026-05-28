/**
 * world/procedural — the procedural building-mesh system
 * (M_V13.DECOMP.WORLD-PROCEDURAL).
 *
 * Already a structured sub-tree before the v0.13 decomposition: the
 * per-building mesh components (buildings/) compose reusable mesh
 * primitives (primitives/), and the faction-material context recolors
 * them per faction at render. This barrel surfaces the whole sub-tree
 * from one entry point; existing deep imports
 * (@/world/procedural/buildings etc.) keep working.
 */
export * from './buildings';
export * from './primitives';
export * from './faction-materials';
export { FactionMaterialsProvider } from './FactionMaterialsContext';
