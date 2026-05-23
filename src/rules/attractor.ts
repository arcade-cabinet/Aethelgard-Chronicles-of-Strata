import type { BoardData } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import type { Rng } from '@/core/rng';
import type { ResourceType } from '@/ecs/components';
import type { ResourceNodePlan } from '@/world/resource-spawn';

/**
 * Attractor rules (spec 102). A Town Hall is the sole attractor — at map
 * generation it guarantees a minimum number of each resource type within its
 * radius, so a freshly-spawned peon always has work in-zone. This makes the
 * game-start fully emergent (no scripted resource sequence) and ensures the AI
 * never starts in a barren zone.
 *
 * Faction-agnostic and deterministic: the existing map PRNG drives any
 * top-up placements.
 */

/**
 * How many of each resource an attractor guarantees within its radius.
 * Science is not biome-spawned (accumulates via science buildings + events
 * per spec 102), so its guarantee is 0.
 */
export const ATTRACTOR_GUARANTEE: Record<ResourceType, number> = {
  wood: 3,
  stone: 2,
  gold: 1,
  science: 0,
};

/** Hex radius of an attractor's resource-guarantee zone (~2-tile zone of control). */
export const ATTRACTOR_RADIUS = 2;

/** Starting amount of a top-up resource node. */
const TOPUP_AMOUNT: Record<ResourceType, number> = {
  wood: 100,
  stone: 80,
  gold: 60,
  science: 0,
};

/** Biomes a top-up node of each type may land on. Science: none (not spawned). */
const ALLOWED_BIOMES: Record<ResourceType, ReadonlySet<string>> = {
  wood: new Set(['FOREST', 'GRASS']),
  stone: new Set(['HIGHLAND', 'MOUNTAIN']),
  gold: new Set(['GRASS', 'HIGHLAND']),
  science: new Set(),
};

/** Count nodes of `type` whose hex key sits within `radius` of (cq, cr). */
function countNearby(
  nodes: ResourceNodePlan[],
  type: ResourceType,
  cq: number,
  cr: number,
  radius: number,
): number {
  let n = 0;
  for (const node of nodes) {
    if (node.resourceType !== type) continue;
    if (hexDistance(node.q, node.r, cq, cr) <= radius) n += 1;
  }
  return n;
}

/**
 * Apply the attractor contract: for the attractor at (`cq`, `cr`), ensure at
 * least `ATTRACTOR_GUARANTEE[type]` resources of each type sit within
 * `ATTRACTOR_RADIUS`. If a type is short, add top-up nodes on eligible nearby
 * tiles (skipping the attractor tile itself, occupied tiles, crossing landings,
 * and tiles already holding a node). Returns the augmented node list.
 */
export function ensureAttractorResources(
  board: BoardData,
  attractorKey: string,
  cq: number,
  cr: number,
  nodes: ResourceNodePlan[],
  rng: Rng,
): ResourceNodePlan[] {
  const out = [...nodes];
  const occupied = new Set(out.map((n) => n.key));

  // candidate tiles inside the radius, sorted deterministically
  const candidates: Array<{ key: string; q: number; r: number; level: number; type: string }> = [];
  for (const tile of board.tiles.values()) {
    if (!tile.walkable || tile.isCrossingLanding) continue;
    const key = getHexKey(tile.q, tile.r);
    if (key === attractorKey || occupied.has(key)) continue;
    if (hexDistance(tile.q, tile.r, cq, cr) > ATTRACTOR_RADIUS) continue;
    candidates.push({ key, q: tile.q, r: tile.r, level: tile.level, type: tile.type });
  }
  candidates.sort((a, b) => a.key.localeCompare(b.key));

  for (const type of ['wood', 'stone', 'gold'] as const) {
    const have = countNearby(out, type, cq, cr, ATTRACTOR_RADIUS);
    const need = ATTRACTOR_GUARANTEE[type] - have;
    if (need <= 0) continue;
    const allowed = ALLOWED_BIOMES[type];
    // shuffle candidates lightly via the map PRNG for placement variation
    const pool = candidates.filter((c) => allowed.has(c.type) && !occupied.has(c.key));
    // pick `need` tiles from the pool — Fisher-Yates partial shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pool[i] as (typeof pool)[number];
      pool[i] = pool[j] as (typeof pool)[number];
      pool[j] = tmp;
    }
    for (let i = 0; i < Math.min(need, pool.length); i++) {
      const c = pool[i] as (typeof pool)[number];
      out.push({
        key: c.key,
        q: c.q,
        r: c.r,
        level: c.level,
        resourceType: type,
        amount: TOPUP_AMOUNT[type],
      });
      occupied.add(c.key);
    }
  }
  return out;
}
