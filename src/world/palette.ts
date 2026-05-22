import type { BiomeType } from '@/core/biome';

/** Canonical biome colors. Source: docs/specs/20-visual-language.md. */
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
