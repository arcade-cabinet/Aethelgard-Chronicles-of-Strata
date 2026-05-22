import { MAP_RADIUS } from './constants';
import worldConfigRaw from '@/config/world.json';
import type { Noise2D } from './noise';

interface WorldConfig {
  biome: {
    heightThresholds: number[];
    moistureCutoffDesert: number;
    moistureCutoffLake: number;
    noiseScale: number;
    islandAttenuationFactor: number;
    lakeModulo: number;
    lakeModuloThreshold: number;
  };
}

const worldConfig = worldConfigRaw as WorldConfig;

const {
  heightThresholds,
  moistureCutoffDesert,
  moistureCutoffLake,
  noiseScale,
  islandAttenuationFactor,
  lakeModulo,
  lakeModuloThreshold,
} = worldConfig.biome;

/** A biome type. OCEAN and LAKE are water; the rest are land. */
export type BiomeType =
  | 'OCEAN'
  | 'LAKE'
  | 'BEACH'
  | 'DESERT'
  | 'GRASS'
  | 'FOREST'
  | 'HIGHLAND'
  | 'MOUNTAIN';

/** The assigned biome of one tile. */
export interface Biome {
  /** Integer elevation tier 0–6. */
  level: number;
  /** Biome type, derived from level + moisture. */
  type: BiomeType;
  /** Moisture value in [0, 1], retained for prop spawning. */
  moisture: number;
}

/** Convert an elevation level + moisture to a biome type (no lake override). */
export function levelToType(level: number, moisture: number): BiomeType {
  if (level === 0) return 'OCEAN';
  if (level === 1) return 'BEACH';
  if (level === 2) return moisture < moistureCutoffDesert ? 'DESERT' : 'GRASS';
  if (level === 3) return moisture < moistureCutoffDesert ? 'DESERT' : 'FOREST';
  if (level === 4) return 'HIGHLAND';
  return 'MOUNTAIN';
}

/** Convert an island-attenuated raw height in [0, ~1] to an elevation tier. */
export function heightToLevel(rawHeight: number): number {
  if (rawHeight <= (heightThresholds[0] ?? 0.1)) return 0;
  if (rawHeight <= (heightThresholds[1] ?? 0.25)) return 1;
  if (rawHeight <= (heightThresholds[2] ?? 0.45)) return 2;
  if (rawHeight <= (heightThresholds[3] ?? 0.6)) return 3;
  if (rawHeight <= (heightThresholds[4] ?? 0.75)) return 4;
  if (rawHeight <= (heightThresholds[5] ?? 0.88)) return 5;
  return 6;
}

/**
 * Assign the biome of tile (q, r). `height` and `moisture` are noise fields
 * sampled at `(q*noiseScale, r*noiseScale)`. The height is attenuated by normalized cube
 * distance from the map centre to produce an island.
 */
export function assignBiome(q: number, r: number, height: Noise2D, moisture: Noise2D): Biome {
  const s = -q - r;
  const nx = q * noiseScale;
  const nz = r * noiseScale;
  let rawHeight = height(nx, nz);
  const moist = moisture(nx + 100, nz + 100);
  const dist = Math.sqrt(q * q + r * r + s * s) / Math.sqrt(3) / MAP_RADIUS;
  rawHeight -= dist ** 2 * islandAttenuationFactor;

  const level = heightToLevel(rawHeight);
  let type = levelToType(level, moist);
  if (
    level >= 3 &&
    level <= 4 &&
    moist > moistureCutoffLake &&
    rawHeight > 0 &&
    rawHeight % lakeModulo < lakeModuloThreshold
  ) {
    type = 'LAKE';
  }
  return { level, type, moisture: moist };
}
