import { MAP_RADIUS } from './constants';
import type { Noise2D } from './noise';

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
  if (level === 2) return moisture < 0.45 ? 'DESERT' : 'GRASS';
  if (level === 3) return moisture < 0.45 ? 'DESERT' : 'FOREST';
  if (level === 4) return 'HIGHLAND';
  return 'MOUNTAIN';
}

/** Convert an island-attenuated raw height in [0, ~1] to an elevation tier. */
export function heightToLevel(rawHeight: number): number {
  if (rawHeight <= 0.1) return 0;
  if (rawHeight <= 0.25) return 1;
  if (rawHeight <= 0.45) return 2;
  if (rawHeight <= 0.6) return 3;
  if (rawHeight <= 0.75) return 4;
  if (rawHeight <= 0.88) return 5;
  return 6;
}

/**
 * Assign the biome of tile (q, r). `height` and `moisture` are noise fields
 * sampled at `(q*0.06, r*0.06)`. The height is attenuated by normalized cube
 * distance from the map centre to produce an island.
 */
export function assignBiome(q: number, r: number, height: Noise2D, moisture: Noise2D): Biome {
  const s = -q - r;
  const nx = q * 0.06;
  const nz = r * 0.06;
  let rawHeight = height(nx, nz);
  const moist = moisture(nx + 100, nz + 100);
  const dist = Math.sqrt(q * q + r * r + s * s) / Math.sqrt(3) / MAP_RADIUS;
  rawHeight -= dist ** 2 * 1.5;

  const level = heightToLevel(rawHeight);
  let type = levelToType(level, moist);
  if (level >= 3 && level <= 4 && moist > 0.85 && rawHeight > 0 && rawHeight % 0.1 < 0.02) {
    type = 'LAKE';
  }
  return { level, type, moisture: moist };
}
