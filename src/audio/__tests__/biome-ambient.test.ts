/**
 * M_FUN.AUDIO.BIOME — pin every biome maps to a registered asset id.
 */
import { describe, expect, it } from 'vitest';
import { ASSET_METADATA } from '@/config/asset-metadata';
import { ALL_BIOMES } from '@/config/mapgen';
import { ambientForBiome, BIOME_AMBIENT } from '../biome-ambient';

describe('biome-ambient (M_FUN.AUDIO.BIOME)', () => {
  it('every BiomeType has a row', () => {
    for (const biome of ALL_BIOMES) {
      expect(BIOME_AMBIENT[biome]).toBeDefined();
    }
  });

  it('every resolved asset id exists in ASSET_METADATA', () => {
    for (const biome of ALL_BIOMES) {
      const id = ambientForBiome(biome);
      expect(ASSET_METADATA[id]).toBeDefined();
    }
  });

  // M_FUN.ECON.QUICKSAND — pin the new biome's ambient route through
  // the existing coast loop (waves + birds). Failure here means the
  // QUICKSAND row in BIOME_AMBIENT got dropped during the JSON-first
  // sweep + would silently play no audio when a player enters one.
  it('QUICKSAND maps to coast ambient', () => {
    expect(ambientForBiome('QUICKSAND')).toBe('audio.ambient.coast');
  });
});
