import { MAP_RADIUS } from '@/config/world';
import { biomeFlagsFor } from '@/rules/biome-flags';
import { assignBiome, type Biome } from './biome';
import { type Crossing, placeCrossings } from './crossings';
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
  /**
   * M_EXPANSION.F.97 — discoverable one-shot resource bonus. Set at
   * board-gen for ~5% of walkable tiles (excluding faction-base safety
   * rings). The first time a player unit ENTERS the tile, the bonus
   * pays out + this field clears to null. Tuple is [ResourceType,
   * amount]. The discoverable trigger lives in path-follow; the
   * bonus picker is biased toward wood (most early-game useful) but
   * occasionally rolls stone or gold.
   */
  hiddenBonus?: { type: 'wood' | 'stone' | 'gold'; amount: number } | null;
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
    // M_REGISTRY.9 — gen-time paint passes driven by a per-mapType
    // pipeline table instead of 4 hand-written if-branches. Adding a
    // new mapType is ONE row in GEN_TIME_PIPELINES; adding a new
    // paint pass is ONE entry per pipeline that uses it.
    runGenTimePass(tiles, radius, map, mapType);
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

// ---------------------------------------------------------------------------
// M_REGISTRY.9 — gen-time paint pipeline.
// ---------------------------------------------------------------------------

/**
 * One paint pass — operates on the tile map in place. Some passes need
 * the rng (mountain/lake/channel scatter); some don't (beach ring,
 * desert blanket). Uniform signature so the pipeline iterator can
 * dispatch them generically.
 */
type PaintPass = (tiles: Map<string, Tile>, radius: number, rng: Rng) => void;

/**
 * Per-mapType pipeline: which paint passes fire, in which order, for
 * each generated map type. Replaces 4 hand-written if-branches in
 * generateBoard (was: `if (mapType !== 'archipelago') paint...`,
 * `if (mapType === 'archipelago') paint...`, etc.).
 *
 * Adding a new mapType = ONE pipeline entry. Adding a new paint pass
 * = ONE function + the right entries in pipelines that use it.
 */
/**
 * Helper: thunk a mountain-pass with a specific intensity. Lets the
 * pipeline registry name the per-mode mountain density without
 * forking the underlying function.
 */
const mountainPass =
  (intensity: number): PaintPass =>
  (tiles, radius, rng) =>
    paintMountainMassif(tiles, radius, rng, intensity);

const GEN_TIME_PIPELINES: Record<GeneratedMapType, PaintPass[]> = {
  // balanced — beach ring + medium mountain clumps (centre-biased so
  // they form choke points between bases) + inland lake. This is the
  // 1v1 RTS shape; the centre-bias inside paintMountainMassif keeps
  // the funnel intent without stamping a literal strip.
  balanced: [paintBeachRing, mountainPass(0.55), paintInlandLake],
  // continent — larger landmass, denser mountain massifs that read
  // as a true ridge system (not a strip).
  continent: [paintBeachRing, mountainPass(0.7), paintInlandLake],
  // archipelago — small islands separated by channels. SPARSE
  // mountains (each island gets at most one small peak) — channels
  // are the funnels, not mountain walls.
  archipelago: [paintBeachRing, paintChannelCuts, mountainPass(0.25), paintInlandLake],
  // dry-land — no inland water + extensive desert + dense mountain
  // ridge-lines (highest intensity for the badlands feel).
  'dry-land': [paintBeachRing, mountainPass(0.75), paintDesertBlanket],
};

/**
 * Run the gen-time paint pipeline for `mapType` over `tiles`, then
 * recompute every tile's `walkable` flag from its final biome + level.
 */
function runGenTimePass(
  tiles: Map<string, Tile>,
  radius: number,
  rng: Rng,
  mapType: GeneratedMapType,
): void {
  const pipeline = GEN_TIME_PIPELINES[mapType];
  for (const pass of pipeline) pass(tiles, radius, rng);
  // Recompute `walkable` after the guided-paint pass — every tile
  // now reflects its FINAL biome + level.
  for (const tile of tiles.values()) {
    tile.walkable = biomeFlagsFor(tile.type).walkable && tile.level < 5;
  }
}

/**
 * M_MAPGEN.4 — paint a deterministic ocean perimeter + beach ring.
 * Tiles at distance > radius-2 → OCEAN (level 0, type OCEAN, moisture 1);
 * tiles at distance == radius-2 OR radius-1 → BEACH (level 1).
 */
function paintBeachRing(tiles: Map<string, Tile>, radius: number, _rng: Rng): void {
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
 * M_MAPGEN.3 — paint MOUNTAIN clumps that act as natural funnels +
 * choke points. The prior implementation stamped a straight 3-axis
 * STRIP through the entire map — including ocean — which was both
 * ugly and useless (impassible walls in water?). User feedback
 * 2026-05-24:
 *   "why the fuck would you design an impassible strip on ANY [...]
 *    mountains create natural FUNNELS and choke points if they are
 *    an impassible strip extending through everything including
 *    water that is just ugly and also useless"
 *
 * New behaviour:
 *   - NEVER paint over OCEAN, BEACH, or LAKE (water stays water)
 *   - Use 2D noise to generate organic massifs — a few clumps, not
 *     a strip
 *   - Threshold is mode-aware via `intensity` param: balanced/
 *     continent get more mountain (chokepoint creation); archipelago
 *     gets less; dry-land gets ridge-line density
 *   - On RTS-style symmetric modes (balanced), bias the noise
 *     centre-ward so SOME mountains end up between the two bases
 *     to create the original funnel intent — but as a CLUMP, not
 *     a line, and ONLY on land
 */
function paintMountainMassif(
  tiles: Map<string, Tile>,
  radius: number,
  rng: Rng,
  intensity = 0.5,
): void {
  // Generate a fresh noise field for the mountain mask. The map PRNG
  // owns this rng, so different seeds give different mountain layouts;
  // same seed reproduces.
  const noise = createNoise2D(rng);
  // Centre-bias: mountains are more likely to appear in the central
  // band so they form the funnel that gives RTS modes their choke
  // point. Falls off smoothly to zero at the perimeter.
  for (const tile of tiles.values()) {
    // Skip water + beach — mountains in water are nonsensical.
    if (tile.type === 'OCEAN' || tile.type === 'BEACH' || tile.type === 'LAKE') continue;
    const d = hexDistFromCenter(tile.q, tile.r);
    // No mountains in the safety ring around the perimeter (already
    // beach/ocean) and no mountains right against the perimeter where
    // they'd block coastal travel.
    if (d > radius - 5) continue;
    // Centre-bias coefficient: 1.0 at centre, 0.0 at d=radius-5.
    const centerBias = Math.max(0, 1 - d / (radius - 5));
    // Sample noise at a frequency that gives ~3-5 distinct clumps
    // per map. Higher freq = more, smaller clumps.
    const n = noise(tile.q * 0.18, tile.r * 0.18);
    // Final mask = noise + centre-bias contribution. Threshold
    // cuts the top `intensity` fraction.
    const mask = n * 0.7 + centerBias * 0.3;
    // Threshold: intensity=0.5 → top ~30% of land tiles become
    // mountain; 0.7 → top ~45%; 0.3 → top ~15%.
    if (mask > 1 - intensity * 0.6) {
      tile.type = 'MOUNTAIN';
      tile.level = 5;
    }
  }
}

/**
 * Archipelago mapType (M_MODES.9) — punch wide LAKE channels through the
 * interior so the map reads as multiple small islands. Two perpendicular
 * channels at the central axis.
 */
function paintChannelCuts(tiles: Map<string, Tile>, radius: number, _rng: Rng): void {
  // M_AUDIT2.ARCH.20 — rng param kept on signature (PaintPass type) but
  // unused by this deterministic-channel implementation; underscore-prefix
  // matches the convention used by paintBeachRing/paintDesertBlanket.
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
function paintDesertBlanket(tiles: Map<string, Tile>, radius: number, _rng: Rng): void {
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
