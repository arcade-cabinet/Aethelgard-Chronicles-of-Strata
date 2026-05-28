import { describe, expect, it } from 'vitest';
import { BIOME_COLORS } from '../biomes/palette';

describe('biome palette', () => {
  it('defines the canonical biome colors', () => {
    expect(BIOME_COLORS.OCEAN).toBe('#0ea5e9');
    expect(BIOME_COLORS.LAKE).toBe('#38bdf8');
    expect(BIOME_COLORS.BEACH).toBe('#fde047');
    expect(BIOME_COLORS.DESERT).toBe('#d97706');
    expect(BIOME_COLORS.GRASS).toBe('#84cc16');
    expect(BIOME_COLORS.FOREST).toBe('#15803d');
    expect(BIOME_COLORS.HIGHLAND).toBe('#64748b');
    expect(BIOME_COLORS.MOUNTAIN).toBe('#475569');
  });
});
