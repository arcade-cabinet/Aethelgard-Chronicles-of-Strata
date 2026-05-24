import type { BiomeType } from '@/core/biome';

/** Canonical biome colors (noon). Source: docs/specs/20-visual-language.md. */
export const BIOME_COLORS: Record<BiomeType, string> = {
  OCEAN: '#0ea5e9',
  LAKE: '#38bdf8',
  BEACH: '#fde047',
  DESERT: '#d97706',
  GRASS: '#84cc16',
  FOREST: '#15803d',
  HIGHLAND: '#64748b',
  MOUNTAIN: '#475569',
};

/**
 * M_EXPANSION.S.65 — evening warm-tint variant of every biome.
 * The DayNightCycle's sky already warms the global tint at sunset
 * via skyRgbAt; this table lets a specific surface override the
 * default warming for biomes that should read MORE differently
 * (e.g. forest greens go almost-orange at dusk, ocean stays cool).
 *
 * Consumers blend toward this color when the day phase is in the
 * sunset/sunrise window (cyclePhase between 0.7 and 0.9 or 0.05 to
 * 0.15 — symmetric around dawn/dusk).
 */
export const BIOME_COLORS_EVENING: Record<BiomeType, string> = {
  OCEAN: '#0c4a6e', // deep cool — ocean barely warms
  LAKE: '#1e40af',
  BEACH: '#fb923c', // sand glows orange
  DESERT: '#c2410c', // already warm — push deeper amber
  GRASS: '#a3a017', // washed-out olive-gold
  FOREST: '#854d0e', // deep amber forest at dusk
  HIGHLAND: '#78716c', // warmer gray
  MOUNTAIN: '#52525b', // slightly warm slate
};
