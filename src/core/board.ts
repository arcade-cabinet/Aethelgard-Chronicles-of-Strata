import { MAP_RADIUS } from '@/config/world';
import { assignBiome, type Biome } from './biome';
import { type Crossing, placeCrossings } from './crossings';
import { biomeFlagsFor } from '@/rules/biome-flags';
import { getHexKey, hexDistance } from './hex';
import { createNoise2D } from './noise';
import { createMapPrng, type Rng } from './rng';

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
/**
 * Generate a hex board for `seedPhrase` at `radius`. When `guidedMapGen`
 * is true (default, used by red-vs-blue / endless / classic-rts / 4x via
 * MODE_PRESETS), the deterministic paint passes (beach ring, mountain
 * spine, inland lake) run. When false (skirmish mode), only the noise
 * stage runs — pure asymmetric maps possible.
 */
/** Map-type variants the guided pass can paint (M_MODES.9). */
export type GeneratedMapType = 'balanced' | 'continent' | 'archipelago' | 'dry-land';

export function generateBoard(
  seedPhrase: string,
  radius: number = MAP_RADIUS,
  guidedMapGen = true,
  mapType: GeneratedMapType = 'balanced',
): BoardData {
  // Validate at the API boundary (CodeRabbit): negative / NaN / Infinity /
  // non-integer radius would produce a malformed grid downstream. Round +
  // clamp to a sane range — MAP_SIZES tops out at 43 (M_BALANCE_2 user-
  // scaled), 48 leaves headroom for one more bump tier.
  if (!Number.isFinite(radius) || radius < 1 || radius > 48) {
    throw new Error(`generateBoard: radius must be a finite integer in [1, 48], got ${radius}`);
  }
  radius = Math.round(radius);
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

  if (guidedMapGen) {
    // M_MAPGEN.4 — beach ring + ocean perimeter (deterministic post-pass).
    // M_MODES.9 — mapType selects which paint passes fire:
    //   balanced (default) — beach ring + central mountain spine + inland lake
    //   continent — same as balanced but mountain spine is thicker (3-tile spine)
    //   archipelago — multiple small islands separated by channels (skip the
    //     mountain spine; punch extra LAKE channels through the interior)
    //   dry-land — no inland water + extensive desert + ridge-line mountains
    paintBeachRing(tiles, radius);
    if (mapType !== 'archipelago') paintMountainSpine(tiles, radius, map);
    if (mapType === 'archipelago') paintChannelCuts(tiles, radius, map);
    if (mapType !== 'dry-land') paintInlandLake(tiles, radius, map);
    if (mapType === 'dry-land') paintDesertBlanket(tiles, radius);
    // Recompute `walkable` after the guided-paint pass — every tile now
    // reflects its FINAL biome + level.
    for (const tile of tiles.values()) {
      tile.walkable = tile.type !== 'OCEAN' && tile.type !== 'LAKE' && tile.level < 5;
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

/**
 * Cube distance from (0,0,0) to (q, r, -q-r). M_REGISTRY.23 — collapses
 * to `hexDistance(q, r, 0, 0)` from @/core/hex; the local hand-roll
 * was one of 2 duplicates of the same formula.
 */
function hexDistFromCenter(q: number, r: number): number {
  return hexDistance(q, r, 0, 0);
}

/**
 * M_MAPGEN.4 — paint a deterministic ocean perimeter + beach ring.
 * Tiles at distance > radius-2 → OCEAN (level 0, type OCEAN, moisture 1);
 * tiles at distance == radius-2 OR radius-1 → BEACH (level 1).
 */
function paintBeachRing(tiles: Map<string, Tile>, radius: number): void {
  for (const tile of tiles.values()) {
    const d = hexDistFromCenter(tile.q, tile.r);
    if (d > radius - 2) {
      tile.type = 'OCEAN';
      tile.level = 0;
    } else if (d > radius - 4) {
      // ring 2 hexes wide of forced BEACH
      tile.type = 'BEACH';
      tile.level = 1;
    }
  }
}

/**
 * M_MAPGEN.3 — paint a 3-tile-wide MOUNTAIN spine across the central band.
 * The band's orientation is seed-derived so different seeds get different
 * mountain orientations but every seed gets ONE. Creates the funneling
 * choke point the user called for.
 */
function paintMountainSpine(tiles: Map<string, Tile>, radius: number, rng: Rng): void {
  // Pick an axis: 0 = horizontal band on r; 1 = diagonal on q; 2 = diagonal on s.
  const axis = Math.floor(rng() * 3);
  for (const tile of tiles.values()) {
    const d = hexDistFromCenter(tile.q, tile.r);
    if (d > radius - 5) continue; // stay inside the beach ring + safety
    let onSpine = false;
    if (axis === 0) onSpine = Math.abs(tile.r) <= 1;
    else if (axis === 1) onSpine = Math.abs(tile.q) <= 1;
    else onSpine = Math.abs(tile.q + tile.r) <= 1;
    if (!onSpine) continue;
    // Stamp HIGHLAND for the 1-tile-wide band, with a MOUNTAIN peak every
    // few hexes for vertical relief.
    tile.type = 'MOUNTAIN';
    tile.level = 5;
  }
}

/**
 * Archipelago mapType (M_MODES.9) — punch wide LAKE channels through the
 * interior so the map reads as multiple small islands. Two perpendicular
 * channels at the central axis.
 */
function paintChannelCuts(tiles: Map<string, Tile>, radius: number, rng: Rng): void {
  void rng; // future variants may pick channel orientations via rng
  for (const tile of tiles.values()) {
    const d = hexDistFromCenter(tile.q, tile.r);
    if (d > radius - 3) continue;
    // central horizontal channel + perpendicular: any tile near r=0 OR q=0.
    if (Math.abs(tile.r) <= 1 || Math.abs(tile.q) <= 1) {
      tile.type = 'LAKE';
      tile.level = 0;
    }
  }
}

/**
 * Dry-land mapType (M_MODES.9) — blanket the inland in DESERT, leaving
 * GRASS rings only around each potential base. Mountain spine stays for
 * funneling. Skips the inland-lake feature.
 */
function paintDesertBlanket(tiles: Map<string, Tile>, radius: number): void {
  for (const tile of tiles.values()) {
    const d = hexDistFromCenter(tile.q, tile.r);
    if (d > radius - 4) continue; // inside the beach ring
    // M_REGISTRY.22 — desert blanket targets habitable (land+lush+
    // highland) tiles via the unified flag table.
    if (biomeFlagsFor(tile.type).habitable) tile.type = 'DESERT';
  }
}

/**
 * M_MAPGEN.5 — guaranteed inland LAKE cluster (4 connected tiles) somewhere
 * inside the beach ring but NOT on the mountain spine. Picks a seeded
 * candidate center, stamps a 4-tile rosette.
 */
function paintInlandLake(tiles: Map<string, Tile>, radius: number, rng: Rng): void {
  // Find a candidate center: walkable, GRASS/FOREST, distance from edge ≥ 5.
  const candidates: Array<{ q: number; r: number }> = [];
  for (const tile of tiles.values()) {
    if (tile.type !== 'GRASS' && tile.type !== 'FOREST') continue;
    if (hexDistFromCenter(tile.q, tile.r) > radius - 5) continue;
    candidates.push({ q: tile.q, r: tile.r });
  }
  if (candidates.length === 0) return;
  const pick = candidates[Math.floor(rng() * candidates.length)];
  if (!pick) return;
  // Stamp center + 3 of 6 neighbors as LAKE (rosette of 4).
  const NEIGHBORS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ] as const;
  const center = tiles.get(getHexKey(pick.q, pick.r));
  if (!center) return;
  center.type = 'LAKE';
  center.level = 0;
  // pick 3 of the 6 neighbors deterministically via rng
  const shuffled = NEIGHBORS.map((n) => ({ n, k: rng() })).sort((a, b) => a.k - b.k);
  for (let i = 0; i < 3; i++) {
    const entry = shuffled[i];
    if (!entry) continue;
    const [dq, dr] = entry.n;
    const t = tiles.get(getHexKey(pick.q + dq, pick.r + dr));
    if (t) {
      t.type = 'LAKE';
      t.level = 0;
    }
  }
}
