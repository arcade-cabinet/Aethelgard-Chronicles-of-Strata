import { areAdjacent, getHexKey, hexDistance } from '@/core/hex';

/**
 * Peon autonomy rules (spec 101). A peon is a mindless, nonviolent brute: it
 * finds a resource, harvests it, carries the load home, deposits, repeats —
 * and when nothing is reachable it expands toward the frontier. It never
 * responds to a command, and it flees a tile that is pulsing under
 * encroachment. This module is the pure decision core; the ECS peon system
 * applies what it returns.
 */

/** A harvestable resource the peon can see — a tile key + axial coords. */
export interface ResourceSite {
  key: string;
  q: number;
  r: number;
}

/** A peon's situation, as the decision function needs to see it. */
export interface PeonView {
  /** The peon's current job state. */
  state: 'IDLE' | 'SEEKING' | 'HARVESTING' | 'CARRYING' | 'DEPOSITING' | 'BUILDING';
  /** Axial position. */
  q: number;
  r: number;
  /** The job's current target tile key (a resource, or empty). */
  targetKey: string;
  /** Whether the peon is carrying a non-empty load. */
  carrying: boolean;
}

/** What the peon should do next — the decision function's output. */
export type PeonAction =
  | { kind: 'seek'; targetKey: string }
  | { kind: 'harvest' }
  | { kind: 'carry-home' }
  | { kind: 'deposit' }
  | { kind: 'idle' }
  | { kind: 'flee'; fromKey: string }
  // M_FUN.QA.AIVAI.TUNE — preserve BUILDING state across jobRouting
  // ticks. Without this kind the routing system would re-seek a
  // peon assigned to construct a building, never letting the build
  // system fire. The routing system uses this as a no-op (state
  // stays BUILDING) until buildSystem completes the structure and
  // resets the peon to IDLE.
  | { kind: 'build'; targetKey: string };

/** The world facts the peon decision needs — all faction-scoped. */
export interface PeonWorld {
  /** Live resource sites (amount > 0) the peon may target. */
  resources: ResourceSite[];
  /** The faction's base tile key — where loads are deposited. */
  baseKey: string;
  /** Tile keys currently pulsing under encroachment — peons avoid these. */
  threatenedTiles: ReadonlySet<string>;
}

/**
 * Find the resource site that's the best fit for a peon, scored
 * with a base-proximity bias that DECAYS with distance from base
 * (M_FUN.QA.AIVAI.TUNE). The bias's job is to stop a peon from
 * trekking across the board to a richer cluster on the opponent's
 * side; once nearby resources are exhausted, the bias falls off
 * and the peon will walk further afield rather than going IDLE
 * forever.
 *
 * Score = distance(peonQ, peonR, node) +
 *         BASE_BIAS * max(0, distance(baseQ, baseR, node) - BIAS_RADIUS)
 *
 * For nodes within BIAS_RADIUS of base: the bias term is 0 →
 * picker effectively does plain peon-distance.
 * For nodes outside BIAS_RADIUS: each extra hex past the bias
 * radius adds BASE_BIAS to the score. With BASE_BIAS = 0.5 and
 * BIAS_RADIUS = 6, a node 10 hexes from base is penalised by 2
 * — enough to prefer a closer-to-base node, but not so much that
 * a faction with no local resources never finds work.
 */
/** M_FUN.MAP.HARVEST-ASSIGN-HELPER — shared bias constants for peon harvest
 * scoring (game-state.ts startup assign + nearestResource() here both use
 * the same formula; exporting from one place ensures they stay in sync). */
export const HARVEST_BASE_BIAS = 0.5;
export const HARVEST_BIAS_RADIUS = 6;
function nearestResource(
  q: number,
  r: number,
  baseQ: number,
  baseR: number,
  sites: ResourceSite[],
): ResourceSite | null {
  let best: ResourceSite | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const site of sites) {
    const baseDist = hexDistance(baseQ, baseR, site.q, site.r);
    const peonDist = hexDistance(q, r, site.q, site.r);
    const baseBias = HARVEST_BASE_BIAS * Math.max(0, baseDist - HARVEST_BIAS_RADIUS);
    const score = peonDist + baseBias;
    if (score < bestScore) {
      bestScore = score;
      best = site;
    }
  }
  return best;
}

/**
 * Decide a peon's next action from its view of the world. The mindless-brute
 * loop (spec 101):
 *
 * 1. On a threatened (pulsing) tile → flee. Peons are nonviolent; they never
 *    stand on a contested tile.
 * 2. Carrying a load → deposit if adjacent to the base, else carry home.
 * 3. Idle, or seeking a target that no longer exists → seek the nearest live
 *    resource. (Resource lists are faction-zone-scoped by the caller, so a peon
 *    naturally exploits its own zone first; as the zone grows by claiming,
 *    new resources enter range — the radial expansion is emergent.)
 * 4. Seeking and adjacent to the target → harvest.
 * 5. Otherwise keep seeking the current target.
 */
export function nextPeonAction(peon: PeonView, world: PeonWorld): PeonAction {
  const peonKey = getHexKey(peon.q, peon.r);

  // 0. flee a pulsing tile — nonviolent peons abandon contested ground
  // FIRST (coderabbit MAJOR PR #10 04:56Z): preserves the flee-priority
  // contract over BUILDING. A peon caught on a threatened tile must
  // drop the hammer and run; without this ordering a builder on a
  // contested foundation would happily get caught in melee.
  if (world.threatenedTiles.has(peonKey)) {
    return { kind: 'flee', fromKey: peonKey };
  }

  // 1. building — keep building when safe. The build site lives in
  // game.buildSites and buildSystem drives progress to completion.
  // Without this short-circuit, the next rule would re-seek the
  // peon and abandon the build. Returns the peon's BUILDING state
  // unchanged so jobRoutingSystem's switch leaves it alone.
  if (peon.state === 'BUILDING' && peon.targetKey) {
    return { kind: 'build', targetKey: peon.targetKey };
  }

  // 2. carrying → deposit or carry home
  if (peon.carrying || peon.state === 'CARRYING') {
    if (areAdjacent(peonKey, world.baseKey) || peonKey === world.baseKey) {
      return { kind: 'deposit' };
    }
    return { kind: 'carry-home' };
  }

  // 3. harvesting and target still live → keep harvesting
  if (peon.state === 'HARVESTING') {
    const targetLive = world.resources.some((s) => s.key === peon.targetKey);
    if (targetLive && (areAdjacent(peonKey, peon.targetKey) || peonKey === peon.targetKey)) {
      return { kind: 'harvest' };
    }
    // target depleted or peon was displaced — fall through to re-seek
  }

  // 4. seeking and adjacent → start harvesting
  if (
    peon.state === 'SEEKING' &&
    peon.targetKey &&
    world.resources.some((s) => s.key === peon.targetKey) &&
    (areAdjacent(peonKey, peon.targetKey) || peonKey === peon.targetKey)
  ) {
    return { kind: 'harvest' };
  }

  // 5. idle / target-lost / still travelling → seek a resource.
  // M_FUN.QA.AIVAI.TUNE — score every candidate against the
  // faction's base so a peon never commits to a node halfway across
  // the map just because it was closest to its spawn. baseKey is
  // already faction-scoped in PeonWorld.
  const [bq, br] = world.baseKey.split(',').map(Number) as [number, number];
  const targetStillLive = peon.targetKey && world.resources.some((s) => s.key === peon.targetKey);
  if (peon.state === 'SEEKING' && targetStillLive) {
    // Coderabbit MAJOR PR #10 05:46Z — respect threatened-tile
    // avoidance even when keeping the current target. The old code
    // would silently re-seek a contested resource tile because the
    // existing target took priority. Switch to the best safe
    // alternative; if there isn't one, idle (the flee path at the
    // top of this function handles a peon already ON the threat).
    if (world.threatenedTiles.has(peon.targetKey)) {
      const bestSafe = nearestResource(peon.q, peon.r, bq, br, world.resources);
      if (bestSafe && !world.threatenedTiles.has(bestSafe.key)) {
        return { kind: 'seek', targetKey: bestSafe.key };
      }
      return { kind: 'idle' };
    }
    // Honor the current target ONLY if it's the best base-anchored
    // pick; otherwise switch. Avoids the "enemy peon walking the
    // length of the board" failure mode.
    const best = nearestResource(peon.q, peon.r, bq, br, world.resources);
    if (best && best.key === peon.targetKey) {
      return { kind: 'seek', targetKey: peon.targetKey };
    }
    if (best && !world.threatenedTiles.has(best.key)) {
      return { kind: 'seek', targetKey: best.key };
    }
    return { kind: 'seek', targetKey: peon.targetKey };
  }
  const nearest = nearestResource(peon.q, peon.r, bq, br, world.resources);
  if (nearest) {
    if (!world.threatenedTiles.has(nearest.key)) {
      return { kind: 'seek', targetKey: nearest.key };
    }
  }
  return { kind: 'idle' };
}
