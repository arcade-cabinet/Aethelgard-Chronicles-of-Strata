/**
 * world/biomes — biome identity (M_V13.DECOMP.WORLD-BIOMES).
 *
 * The canonical biome color palette (palette.ts: day + evening
 * BIOME_COLORS), the single-hex biome swatch test harness, per-biome
 * mountain peaks, and the per-biome decoration scatter. palette is the
 * leaf dependency the terrain mesh colors its vertices from.
 */
export { BIOME_COLORS, BIOME_COLORS_EVENING } from './palette';
export { BiomeSwatch } from './BiomeSwatch';
export { Mountains } from './Mountains';
export {
  Decoration,
  PALETTES,
  type PropEntry,
  type BiomePalette,
  type DecorationProps,
} from './Decoration';
