import { type Biome, assignBiome } from './biome';
import { MAP_RADIUS } from './constants';
import { getHexKey } from './hex';
import { createNoise2D } from './noise';
import { createDualPrng } from './rng';

/** One tile of the generated board. */
export interface Tile extends Biome {
  /** Axial coordinate. */
  q: number;
  /** Axial coordinate. */
  r: number;
  /** Whether units may stand on / path through this tile. */
  walkable: boolean;
}

/** The full generated board. */
export interface BoardData {
  /** The seed phrase this board was generated from. */
  seedPhrase: string;
  /** Every tile, keyed by `getHexKey(q, r)`. */
  tiles: Map<string, Tile>;
}

/**
 * Generate the full board deterministically from a seed phrase. Uses only the
 * map PRNG stream — the event stream is untouched so gameplay randomness stays
 * independent of world generation.
 */
export function generateBoard(seedPhrase: string): BoardData {
  const { map } = createDualPrng(seedPhrase);
  // Two independent noise fields, both fed from the map stream in a fixed order.
  const heightNoise = createNoise2D(map);
  const moistureNoise = createNoise2D(map);

  const tiles = new Map<string, Tile>();
  for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
    const rMin = Math.max(-MAP_RADIUS, -q - MAP_RADIUS);
    const rMax = Math.min(MAP_RADIUS, -q + MAP_RADIUS);
    for (let r = rMin; r <= rMax; r++) {
      const biome = assignBiome(q, r, heightNoise, moistureNoise);
      const walkable = biome.type !== 'OCEAN' && biome.type !== 'LAKE' && biome.level < 5;
      tiles.set(getHexKey(q, r), { q, r, ...biome, walkable });
    }
  }
  return { seedPhrase, tiles };
}
