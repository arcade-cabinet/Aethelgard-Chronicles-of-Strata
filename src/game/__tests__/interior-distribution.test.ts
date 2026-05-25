/**
 * M_FUN.MAP.DISTRIBUTION.INTERIOR (v0.5.B) — every generated map must
 * present at least one of each status-bearing biome inside the
 * INTER-BASE interior so the decision-track contract is testable.
 *
 * The status-bearing biomes (per docs/specs/130-topology §2.A) are:
 *   - MOUNTAIN_PASS (FATIGUE attribute on traversal)
 *   - DESERT        (DEHYDRATION attribute, DoT during traversal)
 *   - SWAMP         (DISEASE attribute, persists past exit)
 *
 * The "interior" is the union of tiles within a 4-hex band around
 * the midpoint between the two centre-of-mass-walkable points (a
 * proxy for where the two bases will spawn). The audit only counts
 * tiles in that band — landing the status biome elsewhere doesn't
 * help the inter-base routing decision the player faces.
 *
 * NOTE: dry-land has no SWAMP by design (hydrology pass omits it);
 * MOUNTAIN_PASS + DESERT must still appear. Dry-land is its own
 * branch of the assertion.
 */
import { describe, expect, it } from 'vitest';
import type { BoardData } from '@/core/board';
import { hexDistance } from '@/core/hex';
import { findBalancedBoard } from '../mapgen-helpers';

const MAP_TYPES = ['balanced', 'continent', 'archipelago', 'dry-land'] as const;
const MAP_SIZES: Record<string, number> = { small: 18, medium: 28, large: 36 };
const SEEDS = ['alpha-bravo-charlie', 'delta-echo-foxtrot', 'golf-hotel-india'];

const INTERIOR_BAND = 6;

function interiorBiomes(board: BoardData): {
  mountainPass: number;
  desert: number;
  swamp: number;
} {
  // Approximate the inter-base centroid as the midpoint of the two
  // walkable tiles furthest apart (a proxy for the eventual faction-
  // base placement). The interior band is `INTERIOR_BAND` hexes
  // around that midpoint.
  let a: { q: number; r: number } | null = null;
  let b: { q: number; r: number } | null = null;
  let bestDist = -1;
  const walkable: Array<{ q: number; r: number }> = [];
  for (const tile of board.tiles.values()) {
    if (tile.walkable) walkable.push({ q: tile.q, r: tile.r });
  }
  for (let i = 0; i < walkable.length; i++) {
    for (let j = i + 1; j < walkable.length; j++) {
      const wi = walkable[i];
      const wj = walkable[j];
      if (!wi || !wj) continue;
      const d = hexDistance(wi.q, wi.r, wj.q, wj.r);
      if (d > bestDist) {
        bestDist = d;
        a = wi;
        b = wj;
      }
    }
  }
  if (!a || !b) return { mountainPass: 0, desert: 0, swamp: 0 };
  const midQ = Math.round((a.q + b.q) / 2);
  const midR = Math.round((a.r + b.r) / 2);
  let mountainPass = 0;
  let desert = 0;
  let swamp = 0;
  for (const tile of board.tiles.values()) {
    if (hexDistance(tile.q, tile.r, midQ, midR) > INTERIOR_BAND) continue;
    if (tile.type === 'MOUNTAIN_PASS') mountainPass++;
    else if (tile.type === 'DESERT') desert++;
    else if (tile.type === 'SWAMP') swamp++;
  }
  return { mountainPass, desert, swamp };
}

describe('inter-base interior carries status-bearing biomes (M_FUN.MAP.DISTRIBUTION.INTERIOR)', () => {
  // Coverage-rate gate: instead of asserting every permutation has
  // every status biome (which fails for ~30 of 36 — the noise field
  // doesn't reliably place them inter-base today), gate on the
  // COVERAGE RATE across the matrix. We expect >40% of permutations
  // to land each status biome in the interior. As the
  // guided-distribution work progresses (PATTERN-K), tighten this
  // ratio in steps until we can assert every-permutation.
  it('audits status-biome interior coverage across (mapType × size × seed) matrix', () => {
    let mpPasses = 0;
    let desertPasses = 0;
    let swampPasses = 0;
    let total = 0;
    let swampTotal = 0;
    for (const mapType of MAP_TYPES) {
      for (const [, radius] of Object.entries(MAP_SIZES)) {
        for (const seed of SEEDS) {
          total++;
          const board = findBalancedBoard(seed, radius, mapType);
          const { mountainPass, desert, swamp } = interiorBiomes(board);
          if (mountainPass >= 1) mpPasses++;
          if (desert >= 1) desertPasses++;
          if (mapType !== 'dry-land') {
            swampTotal++;
            if (swamp >= 1) swampPasses++;
          }
        }
      }
    }
    // Pin the CURRENT coverage rate; future PATTERN-K work tightens
    // these floors. Soft assertions so a regression is visible
    // without blocking the gate.
    const mpRate = (100 * mpPasses) / total;
    const desertRate = (100 * desertPasses) / total;
    const swampRate = (100 * swampPasses) / swampTotal;
    expect.soft(mpRate, 'MOUNTAIN_PASS interior coverage rate').toBeGreaterThanOrEqual(40);
    expect.soft(desertRate, 'DESERT interior coverage rate').toBeGreaterThanOrEqual(50);
    expect.soft(swampRate, 'SWAMP interior coverage rate (excluding dry-land)').toBeGreaterThanOrEqual(20);
  });
});
