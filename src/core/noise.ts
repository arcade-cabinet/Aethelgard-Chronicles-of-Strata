import type { Rng } from './rng';

/** A 2D scalar noise field: (x, z) -> value in [0, 1]. */
export type Noise2D = (x: number, z: number) => number;

const LATTICE = 256;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Build a seeded 2D value-noise field. A `LATTICE`×`LATTICE` grid of random
 * gradients is filled from the PRNG; samples are bilinearly interpolated with a
 * smoothstep fade. Deterministic for a given `rng`.
 */
export function createNoise2D(rng: Rng): Noise2D {
  const grid = new Float32Array(LATTICE * LATTICE);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

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
