import { HEX_DIRECTIONS } from '@/config/world';
import { biomeStyleFor, type CrossingStyle } from './biome';
import type { Tile } from './board';
import { getHexKey, levelDelta } from './hex';
import type { Rng } from './rng';

/**
 * A placed crossing — the traversable link over a one-level cliff between two
 * tiles. Every crossing renders as one of two forms (natural or artificial),
 * styled by the higher tile's biome. See `docs/specs/99-passability-and-slopes.md`.
 */
export interface Crossing {
  /** Hex key of the lower tile. */
  lowKey: string;
  /** Hex key of the higher tile. */
  highKey: string;
  /** `natural` (rockfall / graded hill) or `artificial` (stairs / plank ramp). */
  form: 'natural' | 'artificial';
  /** Biome style of the higher tile — selects the concrete crossing mesh. */
  style: CrossingStyle;
}

/** Order-independent key identifying the edge between two tiles. */
export function crossingKey(keyA: string, keyB: string): string {
  return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
}

/**
 * Extra crossings placed beyond the bare connectivity minimum, as a fraction of
 * the remaining candidate edges — gives a realm a few redundant routes so the
 * board does not feel like a single forced path. Kept low so crossings still
 * read as deliberate, not a fringe.
 */
const REDUNDANCY_FRACTION = 0.12;

/** A minimal union-find over tile keys, for connectivity-first placement. */
class UnionFind {
  private parent = new Map<string, string>();

  /** Find the representative of `key`'s set, with path compression. */
  find(key: string): string {
    let root = this.parent.get(key) ?? key;
    if (root !== key) {
      root = this.find(root);
      this.parent.set(key, root);
    }
    return root;
  }

  /** Union the two sets; returns true if they were previously disjoint. */
  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    this.parent.set(ra, rb);
    return true;
  }
}

/** A candidate edge — two walkable tiles one elevation level apart. */
interface Candidate {
  lowKey: string;
  highKey: string;
}

/**
 * Place crossings across the board's one-level cliffs. Unlike the old
 * place-on-every-edge model, this is **connectivity-first**: it first joins
 * otherwise-separated walkable regions with the minimum crossings, then adds a
 * small redundancy fraction. Each crossing's form (natural / artificial) is a
 * map-PRNG draw; its style comes from the higher tile's biome. Deterministic
 * given `rng` (the map stream).
 */
/**
 * Enumerate every 1-tier edge in the board as a Candidate, with the lower
 * tile as `lowKey`. Deterministic order (tile keys sorted) so the
 * placement passes that consume it are byte-equal across runs.
 *
 * M_MICRO.7.5 — extracted from placeCrossings; the gathering step is
 * self-contained and easier to reason about in isolation.
 */
function gatherCrossingCandidates(tiles: Map<string, Tile>): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const key of [...tiles.keys()].sort()) {
    const tile = tiles.get(key);
    if (!tile?.walkable) continue;
    for (const dir of HEX_DIRECTIONS) {
      const nKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
      const neighbor = tiles.get(nKey);
      if (!neighbor?.walkable) continue;
      if (levelDelta(neighbor, tile) !== 1) continue;
      const edge = crossingKey(key, nKey);
      if (seen.has(edge)) continue;
      seen.add(edge);
      const tileLower = tile.level < neighbor.level;
      candidates.push({
        lowKey: tileLower ? key : nKey,
        highKey: tileLower ? nKey : key,
      });
    }
  }
  return candidates;
}

export function placeCrossings(tiles: Map<string, Tile>, rng: Rng): Map<string, Crossing> {
  const candidates = gatherCrossingCandidates(tiles);

  // Seed the union-find with same-level adjacency, so each flat walkable region
  // is already one set — crossings then only need to join distinct regions.
  const uf = new UnionFind();
  for (const key of [...tiles.keys()].sort()) {
    const tile = tiles.get(key);
    if (!tile?.walkable) continue;
    for (const dir of HEX_DIRECTIONS) {
      const nKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
      const neighbor = tiles.get(nKey);
      if (neighbor?.walkable && neighbor.level === tile.level) {
        uf.union(key, nKey);
      }
    }
  }

  const crossings = new Map<string, Crossing>();
  const place = (c: Candidate): void => {
    const highTile = tiles.get(c.highKey);
    if (!highTile) return;
    crossings.set(crossingKey(c.lowKey, c.highKey), {
      lowKey: c.lowKey,
      highKey: c.highKey,
      form: rng() < 0.5 ? 'natural' : 'artificial',
      style: biomeStyleFor(highTile.type),
    });
    uf.union(c.lowKey, c.highKey);
  };

  // Pass 1 — connectivity: place a crossing wherever it joins two regions.
  const leftover: Candidate[] = [];
  for (const c of candidates) {
    if (uf.find(c.lowKey) !== uf.find(c.highKey)) {
      place(c);
    } else {
      leftover.push(c);
    }
  }

  // Pass 2 — redundancy: a small fraction of the remaining candidates.
  for (const c of leftover) {
    if (rng() < REDUNDANCY_FRACTION) place(c);
  }

  return crossings;
}
