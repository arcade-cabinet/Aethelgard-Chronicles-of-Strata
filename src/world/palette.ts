import type { BiomeType } from '@/core/biome';

/** Canonical biome colors (noon). Source: docs/specs/20-visual-language.md. */
export const BIOME_COLORS: Record<BiomeType, string> = {
  OCEAN: '#0ea5e9',
  LAKE: '#38bdf8',
  // M_FUN.MAP.UTILISATION.SHALLOWS — paler turquoise reads as
  // shallow vs deep ocean; visually invites the eye to consider
  // crossing it.
  SHALLOWS: '#7dd3fc',
  // M_FUN.MAP.SWAMP — sickly green-brown reads as poisonous water.
  SWAMP: '#4d7c0f',
  BEACH: '#fde047',
  DESERT: '#d97706',
  GRASS: '#84cc16',
  FOREST: '#15803d',
  HIGHLAND: '#64748b',
  // M_FUN.MAP.PASS — paler slate-grey distinguishes the walkable
  // pass from the impassible MOUNTAIN around it; reads as "carved
  // path through stone".
  MOUNTAIN_PASS: '#94a3b8',
  MOUNTAIN: '#475569',
  // M_FUN.DYN.VOLCANO — black basalt cone, distinct from grey
  // MOUNTAIN; pairs visually with the LAVA orange so the landmark
  // reads as "this is the volcano, not just another mountain".
  VOLCANO: '#1c1917',
  // LAVA — molten orange-red. High chroma so a player scanning the
  // map can't miss a fresh eruption.
  LAVA: '#dc2626',
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
  SHALLOWS: '#7dd3fc', // pale shallows; barely warms at dusk
  SWAMP: '#3f6212', // swamp glows green-brown at dusk; subtle fog vibe
  BEACH: '#fb923c', // sand glows orange
  DESERT: '#c2410c', // already warm — push deeper amber
  GRASS: '#a3a017', // washed-out olive-gold
  FOREST: '#854d0e', // deep amber forest at dusk
  HIGHLAND: '#78716c', // warmer gray
  MOUNTAIN_PASS: '#a8a29e', // pale path-stone at dusk
  MOUNTAIN: '#52525b', // slightly warm slate
  VOLCANO: '#27272a', // basalt slightly warmer at dusk
  LAVA: '#f97316', // molten glow reads brighter against the sunset
};
