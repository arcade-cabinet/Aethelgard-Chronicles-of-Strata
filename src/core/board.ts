import { MAP_RADIUS } from '@/config/world';
import { assignBiome, type Biome } from './biome';
import { type Crossing, placeCrossings } from './crossings';
import { getHexKey } from './hex';
import { createNoise2D } from './noise';
import { createMapPrng } from './rng';

/** One tile of the generated board. */
export interface Tile extends Biome {
  /** Axial coordinate. */
  q: number;
  /** Axial coordinate. */
  r: number;
  /** Whether units may stand on / path through this tile. */
  walkable: boolean;
  /**
   * True when this tile is the low or high end of a placed crossing. Decoration
   * and resource-node scatter skip these so nothing blocks a crossing. See
   * `docs/specs/99-passability-and-slopes.md`.
   */
  isCrossingLanding: boolean;
}

/** The full generated board. */
export interface BoardData {
  /** The seed phrase this board was generated from. */
  seedPhrase: string;
  /** The hex radius this board was generated at. */
  radius: number;
  /** Every tile, keyed by `getHexKey(q, r)`. */
  tiles: Map<string, Tile>;
  /** Placed crossings, keyed by `crossingKey(lowKey, highKey)`. */
  crossings: Map<string, Crossing>;
}

/**
 * Generate the full board deterministically from a seed phrase. Uses only the
 * **map PRNG** (see `docs/specs/96-prng-and-landing.md`) — gameplay randomness
 * is a separate, independent event stream. `radius` sets the board size
 * (defaults to `MAP_RADIUS`); the same phrase + radius always yields the same
 * board.
 */
export function generateBoard(seedPhrase: string, radius: number = MAP_RADIUS): BoardData {
  const map = createMapPrng(seedPhrase);
  // Two independent noise fields, both fed from the map stream in a fixed order.
  const heightNoise = createNoise2D(map);
  const moistureNoise = createNoise2D(map);

  const tiles = new Map<string, Tile>();
  for (let q = -radius; q <= radius; q++) {
    const rMin = Math.max(-radius, -q - radius);
    const rMax = Math.min(radius, -q + radius);
    for (let r = rMin; r <= rMax; r++) {
      const biome = assignBiome(q, r, heightNoise, moistureNoise);
      const walkable = biome.type !== 'OCEAN' && biome.type !== 'LAKE' && biome.level < 5;
      tiles.set(getHexKey(q, r), { q, r, ...biome, walkable, isCrossingLanding: false });
    }
  }

  const crossings = placeCrossings(tiles, map);
  // Tag the low/high landing tile of every crossing so scatter avoids them.
  for (const c of crossings.values()) {
    const low = tiles.get(c.lowKey);
    const high = tiles.get(c.highKey);
    if (low) low.isCrossingLanding = true;
    if (high) high.isCrossingLanding = true;
  }

  return { seedPhrase, radius, tiles, crossings };
}
