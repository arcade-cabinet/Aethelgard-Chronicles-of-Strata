import { MAP_RADIUS } from '@/config/world';
import { MOUNTAIN_TUNING, mapTypeRule } from '@/config/mapgen';
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
      const biome = assignBiome(q, r, heightNoise, moistureNoise, radius);
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
 * Hydrology pass names map to functions. Adding a new hydrology mode
 * (e.g. 'tundraSnow' or 'volcanicFissures') = one entry here + one
 * new paint function + one updated MapTypeRuleSchema enum value.
 */
const HYDROLOGY_PASSES: Record<string, PaintPass> = {
  inlandLake: paintInlandLake,
  desertBlanket: paintDesertBlanket,
  multiIsland: paintMultiIslandChannels,
};

/**
 * Run the gen-time paint pipeline for `mapType` over `tiles`, then
 * recompute every tile's `walkable` flag from its final biome + level.
 *
 * Pipeline order: beach ring → optional channels → mountains →
 * hydrology. Per-mapType rules load from src/config/mapgen.json via
 * the Zod-validated loader (M_FUN.ARCH.CONFIG); adding a mapType or
 * tuning an intensity is a config-file change, NOT a code change.
 */
function runGenTimePass(
  tiles: Map<string, Tile>,
  radius: number,
  rng: Rng,
  mapType: GeneratedMapType,
): void {
  const cfg = mapTypeRule(mapType);
  if (!cfg) {
    throw new Error(`runGenTimePass: mapType '${mapType}' has no row in mapgen.json#/mapTypes`);
  }
  const hydrology = HYDROLOGY_PASSES[cfg.hydrology];
  if (!hydrology) {
    throw new Error(
      `runGenTimePass: unknown hydrology '${cfg.hydrology}' for mapType '${mapType}'`,
    );
  }
  paintBeachRing(tiles, radius, rng);
  if (cfg.channels) paintChannelCuts(tiles, radius, rng);
  paintMountainMassif(tiles, radius, rng, cfg.mountainIntensity);
  hydrology(tiles, radius, rng);
  // M_FUN.MAP.SWAMP — paint after hydrology so the lake-adjacency
  // check finds the freshly-placed LAKE. Skips dry-land (no lake to
  // adjacent to → no swamp candidates).
  paintSwampPatches(tiles, radius, rng);
  // M_FUN.MAP.UTILISATION.SHALLOWS — convert the OCEAN ring closest
  // to land into SHALLOWS so a future aquatic unit (Ferryman) can
  // bridge between islands. Decouples the gameplay surface from
  // pure landmass — large oceans stop wasting board space.
  paintShallowsRing(tiles);
  // Recompute `walkable` after the guided-paint pass — every tile
  // now reflects its FINAL biome + level.
  for (const tile of tiles.values()) {
    tile.walkable = biomeFlagsFor(tile.type).walkable && tile.level < 5;
  }
}

/**
 * M_FUN.MAP.UTILISATION.SHALLOWS — convert OCEAN tiles adjacent to
 * any LAND tile (BEACH/GRASS/FOREST/DESERT/HIGHLAND/MOUNTAIN/etc)
 * into SHALLOWS. This creates a 1-hex "wadeable" ring around every
 * landmass that an aquatic unit can use to bridge between islands.
 * Deep OCEAN (no land neighbour) stays impassable. Land biomes are
 * untouched.
 */
function paintShallowsRing(tiles: Map<string, Tile>): void {
  const LAND_TYPES = new Set<Tile['type']>([
    'BEACH',
    'GRASS',
    'FOREST',
    'DESERT',
    'HIGHLAND',
    'MOUNTAIN',
    'MOUNTAIN_PASS',
    'SWAMP',
    'VOLCANO',
  ]);
  const newShallows: string[] = [];
  for (const tile of tiles.values()) {
    if (tile.type !== 'OCEAN') continue;
    let adjacentLand = false;
    for (const nKey of hexNeighbors(tile.q, tile.r)) {
      const n = tiles.get(nKey);
      if (n && LAND_TYPES.has(n.type)) {
        adjacentLand = true;
        break;
      }
    }
    if (adjacentLand) newShallows.push(getHexKey(tile.q, tile.r));
  }
  for (const key of newShallows) {
    const t = tiles.get(key);
    if (!t) continue;
    t.type = 'SHALLOWS';
    t.level = 1;
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
// Mountain noise tuning lives in src/config/mapgen.json under
// `mountain.*` — load via MOUNTAIN_TUNING. Centre-bias asymmetry
// IS the funnel: at intensity=0.55, centerBias=1 → threshold 0.67 →
// ~52% of CENTRAL land becomes mountain; perimeter tiles
// (centerBias~=0) need n>0.96, so almost never. Documented in
// PRD-v0.4 §6.3 so a future tuner doesn't trust a wrong "% of
// land" eyeballing.

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
  // Guard the centre-bias denominator: a radius <= safetyRing would
  // yield negative/zero span and NaN/Infinity bias. Clamp to 1 so
  // tiny radii degrade gracefully (mountains still place; just no
  // centre-bias). generateBoard validates radius in [1, 48].
  const t = MOUNTAIN_TUNING;
  const span = Math.max(1, radius - t.safetyRing);
  for (const tile of tiles.values()) {
    // Skip water + beach — mountains in water are nonsensical.
    if (tile.type === 'OCEAN' || tile.type === 'BEACH' || tile.type === 'LAKE') continue;
    const d = hexDistFromCenter(tile.q, tile.r);
    if (d > radius - t.safetyRing) continue;
    // Centre-bias coefficient: 1.0 at centre, 0.0 at d=span.
    const centerBias = Math.max(0, 1 - d / span);
    const n = noise(tile.q * t.noiseFreq, tile.r * t.noiseFreq);
    const mask = n * t.noiseWeight + centerBias * t.centerBiasWeight;
    if (mask > 1 - intensity * t.intensityScale) {
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
  const isthmusThreshold = t.isthmusThreshold;
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
    if (mountainNeighbours <= isthmusThreshold) {
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
/**
 * M_FUN.MAP.SWAMP — paint SWAMP patches in low-elevation moist
 * pockets. Two-axis policy: must be currently GRASS or FOREST AND
 * adjacent to LAKE (or, on continents, near the centre at high
 * moisture). Walkable but applies disease (M_FUN.ATTR.DISEASE) so
 * armies need a Healer to push through (M_FUN.UNIT.HEAL).
 *
 * Per-mode intensity will land in mapgen.json#mapTypes once the
 * generator strategies milestone (M_FUN.MAP.PER_MODE) splits the
 * generator into per-mode composers. For now: ONE small patch
 * adjacent to the inland lake, deterministic per seed.
 */
function paintSwampPatches(tiles: Map<string, Tile>, radius: number, rng: Rng): void {
  // Find LAKE-adjacent walkable tiles.
  const NEIGHBORS = [
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ] as const;
  const candidates: Array<{ q: number; r: number }> = [];
  for (const tile of tiles.values()) {
    if (tile.type !== 'GRASS' && tile.type !== 'FOREST') continue;
    if (hexDistFromCenter(tile.q, tile.r) > radius - 3) continue;
    // Adjacent to LAKE?
    for (const [dq, dr] of NEIGHBORS) {
      const n = tiles.get(getHexKey(tile.q + dq, tile.r + dr));
      if (n?.type === 'LAKE') {
        candidates.push({ q: tile.q, r: tile.r });
        break;
      }
    }
  }
  if (candidates.length === 0) return;
  const pick = candidates[Math.floor(rng() * candidates.length)];
  if (!pick) return;
  // Stamp center + 1-2 adjacent walkable tiles as SWAMP.
  const center = tiles.get(getHexKey(pick.q, pick.r));
  if (!center) return;
  center.type = 'SWAMP';
  center.level = 1;
  const shuffled = NEIGHBORS.map((n) => ({ n, k: rng() })).sort((a, b) => a.k - b.k);
  let stamped = 0;
  for (const { n } of shuffled) {
    if (stamped >= 2) break;
    const [dq, dr] = n;
    const t = tiles.get(getHexKey(pick.q + dq, pick.r + dr));
    if (t && (t.type === 'GRASS' || t.type === 'FOREST')) {
      t.type = 'SWAMP';
      t.level = 1;
      stamped++;
    }
  }
}

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

/**
 * M_FUN.MAP.UTILISATION.ISLANDS — multi-island hydrology.
 *
 * Carves 2-3 OCEAN strips across the landmass at random angles so
 * the board renders as 3-7 disconnected islands joined only by
 * SHALLOWS (added by the later paintShallowsRing pass). Distinct
 * geometry from inlandLake (one centre carve) and from
 * desertBlanket (no water at all).
 *
 * Used by the 'archipelago' mapType (per src/config/mapgen.json).
 * Deterministic via the map PRNG.
 */
function paintMultiIslandChannels(tiles: Map<string, Tile>, _radius: number, rng: Rng): void {
  // Three random radial-angle channels, each ~2 tiles wide. The
  // strip is defined by a perpendicular distance from a line
  // through the origin at angle θ; tiles within `width/2` of the
  // line get flipped to OCEAN (level 0). Channels stop short of
  // the very centre (carve leaves a small inner island).
  const channelCount = 2 + Math.floor(rng() * 2); // 2 or 3 channels
  const channels: Array<{ ux: number; uy: number; width: number; gapHalf: number }> = [];
  for (let c = 0; c < channelCount; c++) {
    const theta = rng() * Math.PI;
    channels.push({
      ux: Math.cos(theta),
      uy: Math.sin(theta),
      width: 2.0, // total strip width in axial-unit space
      gapHalf: 2.5, // half-size of the central gap so the centre stays land
    });
  }
  for (const tile of tiles.values()) {
    if (tile.type === 'OCEAN' || tile.type === 'BEACH') continue;
    // Axial → cartesian-ish for distance calcs. Approximation only
    // matters as a gradient; pointy-top hex math isn't required
    // because we only care about which side of a line each tile is.
    const x = tile.q;
    const y = tile.r;
    for (const ch of channels) {
      // Perpendicular distance from the line through origin with
      // direction (ux, uy): |x*uy - y*ux|.
      const perp = Math.abs(x * ch.uy - y * ch.ux);
      // Distance along the line (signed): x*ux + y*uy. Skip tiles
      // inside the central gap so the carve doesn't bisect a base.
      const along = Math.abs(x * ch.ux + y * ch.uy);
      if (perp <= ch.width / 2 && along > ch.gapHalf) {
        tile.type = 'OCEAN';
        tile.level = 0;
        break;
      }
    }
  }
}
