import type { BoardData } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import type { Rng } from '@/core/rng';
import { RESOURCES } from '@/config/resources';
import type { ResourceType } from '@/ecs/components';
import type { ResourceNodePlan } from '@/world/resource-spawn';
import { RESOURCE_PROFILES } from './resource-profiles';

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
/**
 * QW-2 (coderabbit + simplifier reviewer) — guarantee counts now
 * derive from `src/config/resources.json#attractorGuarantee`. Adding
 * a 6th slot picks up its starting-ring guarantee automatically.
 * Passive-trickle slots (science, mana) and risk-bearing slots
 * (peat, amber) default to 0; food gets a small guarantee so the
 * starting kit can sustain a few units before ranging out.
 */
export const ATTRACTOR_GUARANTEE: Record<ResourceType, number> = Object.fromEntries(
  RESOURCES.map((r) => [r.id, r.attractorGuarantee ?? 0]),
) as Record<ResourceType, number>;

/** Hex radius of an attractor's resource-guarantee zone (~2-tile zone of control). */
export const ATTRACTOR_RADIUS = 2;

// M_EXPANSION.S.52 — TOPUP_AMOUNT + ALLOWED_BIOMES collapsed onto
// the unified RESOURCE_PROFILES registry. Adding a new harvestable
// resource is ONE row in resource-profiles.ts now; the attractor
// reads biomes + topupAmount directly off the profile.

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

  // QW-2 — iterate the registry-driven guarantee list (anything with
  // attractorGuarantee > 0) instead of hardcoding `['wood','stone','gold']`.
  // Adding food = 2 in resources.json auto-extends the topup loop.
  const guaranteedSlots = (RESOURCES.filter((r) => (r.attractorGuarantee ?? 0) > 0).map(
    (r) => r.id,
  ) as ResourceType[]);
  for (const type of guaranteedSlots) {
    const have = countNearby(out, type, cq, cr, ATTRACTOR_RADIUS);
    const need = ATTRACTOR_GUARANTEE[type] - have;
    if (need <= 0) continue;
    const allowed = RESOURCE_PROFILES[type].biomes;
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
        amount: RESOURCE_PROFILES[type].topupAmount,
      });
      occupied.add(c.key);
    }
  }
  return out;
}
