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
  | { kind: 'flee'; fromKey: string };

/** The world facts the peon decision needs — all faction-scoped. */
export interface PeonWorld {
  /** Live resource sites (amount > 0) the peon may target. */
  resources: ResourceSite[];
  /** The faction's base tile key — where loads are deposited. */
  baseKey: string;
  /** Tile keys currently pulsing under encroachment — peons avoid these. */
  threatenedTiles: ReadonlySet<string>;
}

/** Find the resource site nearest to (q, r). */
function nearestResource(q: number, r: number, sites: ResourceSite[]): ResourceSite | null {
  let best: ResourceSite | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const site of sites) {
    const d = hexDistance(q, r, site.q, site.r);
    if (d < bestDist) {
      bestDist = d;
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

  // 1. flee a pulsing tile — nonviolent peons abandon contested ground
  if (world.threatenedTiles.has(peonKey)) {
    return { kind: 'flee', fromKey: peonKey };
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

  // 5. idle / target-lost / still travelling → seek the nearest live resource
  const targetStillLive = peon.targetKey && world.resources.some((s) => s.key === peon.targetKey);
  if (peon.state === 'SEEKING' && targetStillLive) {
    return { kind: 'seek', targetKey: peon.targetKey };
  }
  const nearest = nearestResource(peon.q, peon.r, world.resources);
  if (nearest) {
    // avoid seeking a resource that sits on a threatened tile
    if (!world.threatenedTiles.has(nearest.key)) {
      return { kind: 'seek', targetKey: nearest.key };
    }
  }
  return { kind: 'idle' };
}
