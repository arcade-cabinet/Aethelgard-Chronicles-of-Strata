import { MAP_RADIUS } from '@/config/world';
import { biomeFlagsFor } from '@/rules/biome-flags';
import { assignBiome, type Biome } from './biome';
import { type Crossing, placeCrossings } from './crossings';
import { getHexKey, hexDistance, hexNeighbors } from './hex';
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
 * Per-mapType configuration. Differences between modes read as a
 * table (3 columns × 4 rows) instead of 4 inline array literals
 * where you have to eyeball-diff what's missing.
 *
 * - mountainIntensity: 0..1 dial into paintMountainMassif (balanced
 *   0.55 = centre-biased funnel; archipelago 0.25 = sparse so the
 *   channels do the funnel work; dry-land 0.75 = badlands ridge).
 * - channels: whether to run paintChannelCuts (archipelago only —
 *   carves the islands).
 * - hydrology: the third paint pass — inland-lake everywhere except
 *   dry-land which gets a desert blanket instead.
 */
interface MapTypeConfig {
  mountainIntensity: number;
  channels: boolean;
  hydrology: PaintPass;
}

const MAP_TYPE_CONFIG: Record<GeneratedMapType, MapTypeConfig> = {
  balanced: { mountainIntensity: 0.55, channels: false, hydrology: paintInlandLake },
  continent: { mountainIntensity: 0.7, channels: false, hydrology: paintInlandLake },
  archipelago: { mountainIntensity: 0.25, channels: true, hydrology: paintInlandLake },
  'dry-land': { mountainIntensity: 0.75, channels: false, hydrology: paintDesertBlanket },
};

/**
 * Run the gen-time paint pipeline for `mapType` over `tiles`, then
 * recompute every tile's `walkable` flag from its final biome + level.
 *
 * Pipeline order: beach ring → optional channels → mountains →
 * hydrology. Reusing one assembly removes 4 array literals and the
 * mountainPass thunk; per-mode differences live in MAP_TYPE_CONFIG.
 */
function runGenTimePass(
  tiles: Map<string, Tile>,
  radius: number,
  rng: Rng,
  mapType: GeneratedMapType,
): void {
  const cfg = MAP_TYPE_CONFIG[mapType];
  paintBeachRing(tiles, radius, rng);
  if (cfg.channels) paintChannelCuts(tiles, radius, rng);
  paintMountainMassif(tiles, radius, rng, cfg.mountainIntensity);
  cfg.hydrology(tiles, radius, rng);
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
// Noise tuning constants for paintMountainMassif. Named so future
// tuners don't have to reverse-engineer the formula.
//
// - NOISE_FREQ: spatial frequency of the noise sample. Tuned for
//   3-5 clumps per map at radius 18. Higher = more, smaller clumps.
// - NOISE_WEIGHT / CENTER_BIAS_WEIGHT: how much each component
//   contributes to the final mask. Together they sum to 1.0; the
//   centre bias nudges clumps inward to form choke points without
//   degenerating into a strip.
// - INTENSITY_SCALE: maps the [0..1] intensity dial into a threshold
//   shift. With intensity=0.55 + centerBias=1, mask~=0.85 → threshold
//   0.67 → ~52% of CENTRAL land becomes mountain; perimeter tiles
//   (centerBias~=0) need n>0.96 to paint, so almost never. The
//   asymmetry IS the funnel — documented here so the next tuner
//   doesn't trust the prior (wrong) "~30% of land" comment.
const MOUNTAIN_NOISE_FREQ = 0.18;
const MOUNTAIN_NOISE_WEIGHT = 0.7;
const MOUNTAIN_CENTER_BIAS_WEIGHT = 0.3;
const MOUNTAIN_INTENSITY_SCALE = 0.6;
// Minimum tiles between the perimeter and where mountains may paint.
// Keeps coastal travel open AND avoids divide-by-zero in centerBias
// for small maps (radius<=5 would yield centerBias = d / 0 = NaN).
const MOUNTAIN_SAFETY_RING = 5;

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
  // Guard the centre-bias denominator: a radius <= MOUNTAIN_SAFETY_RING
  // would yield negative/zero span and NaN/Infinity bias. Clamp to 1
  // so tiny radii degrade gracefully (mountains still place; just no
  // centre-bias). board.ts's generateBoard validates radius in [1, 48].
  const span = Math.max(1, radius - MOUNTAIN_SAFETY_RING);
  for (const tile of tiles.values()) {
    // Skip water + beach — mountains in water are nonsensical.
    if (tile.type === 'OCEAN' || tile.type === 'BEACH' || tile.type === 'LAKE') continue;
    const d = hexDistFromCenter(tile.q, tile.r);
    if (d > radius - MOUNTAIN_SAFETY_RING) continue;
    // Centre-bias coefficient: 1.0 at centre, 0.0 at d=span.
    const centerBias = Math.max(0, 1 - d / span);
    const n = noise(tile.q * MOUNTAIN_NOISE_FREQ, tile.r * MOUNTAIN_NOISE_FREQ);
    const mask = n * MOUNTAIN_NOISE_WEIGHT + centerBias * MOUNTAIN_CENTER_BIAS_WEIGHT;
    if (mask > 1 - intensity * MOUNTAIN_INTENSITY_SCALE) {
      tile.type = 'MOUNTAIN';
      tile.level = 5;
      // Set walkable inline so this function is safe to call OUTSIDE
      // the GEN_TIME_PIPELINES context (e.g. a unit test that paints
      // mountains then checks pathing). runGenTimePass also calls
      // recomputeWalkable() globally afterward, which is fine — this
      // just removes the foot-gun of standalone-callable footprint
      // leaving stale walkable=true on level-5 MOUNTAIN.
      tile.walkable = false;
    }
  }

  // M_FUN.MAP.PASS — isthmus detection. After the massif is
  // stamped, find every MOUNTAIN tile whose mountain-neighbour count
  // is at most ISTHMUS_THRESHOLD; convert to MOUNTAIN_PASS. Necks +
  // isolated peaks fit this filter: an interior mountain has 6
  // mountain neighbours, a hard-coast edge ~4-5, an isthmus 2-3, an
  // isolated peak 0-1.
  //
  // Result: the massif gains discrete passes where units can move
  // through at reduced speed (terrain-cost MOUNTAIN_PASS=1.7×) and
  // Wall/Watchtower can fortify the choke (biome-flags buildable=true).
  // Doesn't carve a hole in the massif's core (interior mountains
  // have 6 neighbours) — only the natural narrow points.
  const ISTHMUS_THRESHOLD = 3;
  // Snapshot the keys to avoid iteration mutation; pass-tile creation
  // could otherwise feed back into the same loop's neighbour count.
  const mountainKeys: string[] = [];
  for (const tile of tiles.values()) {
    if (tile.type === 'MOUNTAIN') mountainKeys.push(getHexKey(tile.q, tile.r));
  }
  for (const key of mountainKeys) {
    const tile = tiles.get(key);
    if (!tile) continue;
    let mountainNeighbours = 0;
    for (const nKey of hexNeighbors(tile.q, tile.r)) {
      const n = tiles.get(nKey);
      if (n?.type === 'MOUNTAIN') mountainNeighbours += 1;
    }
    if (mountainNeighbours <= ISTHMUS_THRESHOLD) {
      tile.type = 'MOUNTAIN_PASS';
      tile.level = 3;
      tile.walkable = true;
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
