import { WORLD } from '@/config/world';
import type { Rng } from './rng';

/** A 2D scalar noise field: (x, z) -> value in [0, 1]. */
export type Noise2D = (x: number, z: number) => number;

const LATTICE = 256;
/** Number of fractal octaves summed. More octaves = more fine detail + contrast. */
const OCTAVES: number = WORLD.noise.octaves;
/** Per-octave amplitude falloff. */
const PERSISTENCE: number = WORLD.noise.persistence;
/** Per-octave frequency multiplier. */
const LACUNARITY: number = WORLD.noise.lacunarity;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** A single lattice of value-noise, bilinearly interpolated. */
function singleOctave(grid: Float32Array): Noise2D {
  const at = (xi: number, zi: number): number => {
    const x = ((xi % LATTICE) + LATTICE) % LATTICE;
    const z = ((zi % LATTICE) + LATTICE) % LATTICE;
    return grid[z * LATTICE + x] ?? 0;
  };
  return (x, z) => {
    const x0 = Math.floor(x);
    const z0 = Math.floor(z);
    const fx = smoothstep(x - x0);
    const fz = smoothstep(z - z0);
    const v00 = at(x0, z0);
    const v10 = at(x0 + 1, z0);
    const v01 = at(x0, z0 + 1);
    const v11 = at(x0 + 1, z0 + 1);
    const top = v00 + (v10 - v00) * fx;
    const bottom = v01 + (v11 - v01) * fx;
    return top + (bottom - top) * fz;
  };
}

/**
 * Build a seeded 2D fractal value-noise field (FBM). `OCTAVES` lattices are
 * summed at rising frequency and falling amplitude, then the result is contrast-
 * stretched so the field reliably spans the full [0, 1] range. A single-octave
 * field clusters near its mean and starves the moisture-driven biome variety;
 * the fractal sum restores the spread. Deterministic for a given `rng`.
 */
export function createNoise2D(rng: Rng): Noise2D {
  const grid = new Float32Array(LATTICE * LATTICE);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();
  // a per-octave coordinate offset, so octaves sample distinct lattice regions
  const offsets = Array.from({ length: OCTAVES }, () => ({
    ox: rng() * LATTICE,
    oz: rng() * LATTICE,
  }));
  const octave = singleOctave(grid);

  // Theoretical amplitude sum, for normalizing the raw FBM back into [0, 1].
  let ampSum = 0;
  for (let o = 0; o < OCTAVES; o++) ampSum += PERSISTENCE ** o;

  return (x, z) => {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    for (let o = 0; o < OCTAVES; o++) {
      const off = offsets[o] ?? { ox: 0, oz: 0 };
      total += octave(x * frequency + off.ox, z * frequency + off.oz) * amplitude;
      frequency *= LACUNARITY;
      amplitude *= PERSISTENCE;
    }
    const normalized = total / ampSum;
    // contrast stretch around 0.5 — pushes the clustered mid-range toward the
    // extremes so biome thresholds at 0.45 / 0.85 are reachable.
    const stretched = 0.5 + (normalized - 0.5) * 1.8;
    return Math.min(1, Math.max(0, stretched));
  };
}
