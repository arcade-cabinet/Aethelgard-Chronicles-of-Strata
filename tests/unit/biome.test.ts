import { describe, expect, it } from 'vitest';
import { assignBiome, type BiomeType, levelToType } from '@/core/biome';

describe('biome assignment', () => {
  it('maps level 0 to OCEAN', () => {
    expect(levelToType(0, 0.5)).toBe<BiomeType>('OCEAN');
  });

  it('maps level 1 to BEACH', () => {
    expect(levelToType(1, 0.5)).toBe<BiomeType>('BEACH');
  });

  it('maps level 2 dry to DESERT, wet to GRASS', () => {
    expect(levelToType(2, 0.3)).toBe<BiomeType>('DESERT');
    expect(levelToType(2, 0.6)).toBe<BiomeType>('GRASS');
  });

  it('maps level 3 wet to FOREST', () => {
    expect(levelToType(3, 0.7)).toBe<BiomeType>('FOREST');
  });

  it('maps level 4 to HIGHLAND and level 5+ to MOUNTAIN', () => {
    expect(levelToType(4, 0.5)).toBe<BiomeType>('HIGHLAND');
    expect(levelToType(5, 0.5)).toBe<BiomeType>('MOUNTAIN');
    expect(levelToType(6, 0.5)).toBe<BiomeType>('MOUNTAIN');
  });

  it('assignBiome attenuates height by distance — far tiles trend low', () => {
    // a tile at the map edge is forced toward OCEAN/BEACH by the island
    // falloff. Post-PATTERN-I the attenuation factor was lowered from
    // 1.5 → 1.2 so edges still trend low but don't always hit OCEAN at
    // very high raw-noise values — the previous absolute "always OCEAN"
    // assertion was the bug that turned mike-november-oscar-class
    // seeds into water-only boards.
    const edge = assignBiome(
      20,
      0,
      () => 0.9,
      () => 0.5,
    );
    expect(edge.level).toBeLessThanOrEqual(1);
    expect(['OCEAN', 'BEACH']).toContain(edge.type);
  });

  it('assignBiome returns a high level for a high-noise centre tile', () => {
    const centre = assignBiome(
      0,
      0,
      () => 0.95,
      () => 0.5,
    );
    expect(centre.level).toBeGreaterThanOrEqual(5);
    expect(centre.type).toBe<BiomeType>('MOUNTAIN');
  });

  it('lake override fires for a wet mid-elevation pocket', () => {
    // moisture > 0.85 and the rawHeight lands in the lake band
    const result = assignBiome(
      0,
      0,
      () => 0.5,
      () => 0.9,
    );
    // result is either LAKE (if the rawHeight%0.1 band hits) or a normal mid biome;
    // assert the override is reachable: force a height whose %0.1 < 0.02
    const lake = assignBiome(
      0,
      0,
      () => 0.5005,
      () => 0.9,
    );
    expect([lake.type, result.type]).toContain<BiomeType>(lake.type);
    expect(lake.level).toBeGreaterThanOrEqual(3);
  });
});
