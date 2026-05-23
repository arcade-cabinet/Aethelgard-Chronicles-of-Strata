import type { World } from 'koota';
import { hexDistance } from '@/core/hex';
import {
  AttractorBehavior,
  ConsumerBehavior,
  DefensiveBehavior,
  type Faction,
  FactionTrait,
  HexPosition,
  MoverBehavior,
  OffensiveBehavior,
} from '@/ecs/components';

/**
 * The bi-signed magnetic force field (spec 102 + M_ARCHETYPE.6). Every
 * archetype-bearing entity contributes a per-tile force *for an observer
 * faction*. Positive = attractive (where the observer wants to be);
 * negative = repulsive (where it shouldn't be).
 *
 * Consumers:
 *   1. Placement snapping — a new road snaps toward existing Movers
 *      (positive force from same-material Movers).
 *   2. Pathfinding cost (future) — gate-aware pathing biases toward
 *      friendly Movers and away from enemy Defenders.
 *   3. AI targeting / motivation — score "should I go here?" by sampling
 *      the field at candidate tiles.
 *
 * Today's commit ships the rules-layer scoring function; the three
 * consumers wire onto it incrementally.
 */
export interface FieldParams {
  /** Which faction is observing the field (sign flips for enemy contributions). */
  faction: Faction;
  /** Tile to sample. */
  q: number;
  r: number;
}

/**
 * Compute the bi-signed force at `(q, r)` for `faction`. Iterates every
 * archetype-bearing entity; the sign depends on whether the entity is
 * friendly or enemy + the archetype's role:
 *
 *   - Friendly Attractor / Consumer / Mover → positive (pulls toward).
 *   - Friendly Defensive / Offensive → mildly positive (protected ground).
 *   - Enemy Offensive → strong negative (danger).
 *   - Enemy Defensive → moderate negative (blocked).
 *   - Enemy Attractor / Consumer → mildly negative (contested territory).
 *
 * Distance falloff is 1 / (1 + d²) so adjacent contributions dominate.
 */
export function sampleField(world: World, params: FieldParams): number {
  let force = 0;
  for (const e of world.query(HexPosition)) {
    const h = e.get(HexPosition);
    if (!h) continue;
    const d = hexDistance(h.q, h.r, params.q, params.r);
    const falloff = 1 / (1 + d * d);
    const f = e.get(FactionTrait)?.faction;
    const sign = f === params.faction ? 1 : f ? -1 : 0; // unfactioned = neutral
    if (sign === 0) {
      // resources / movers without faction still attract any peon faction
      if (e.has(ConsumerBehavior)) force += falloff * 0.5;
      if (e.has(MoverBehavior)) force += falloff * 0.3;
      continue;
    }
    // archetype-weighted contribution
    if (e.has(AttractorBehavior)) force += sign * falloff * 2.0;
    if (e.has(OffensiveBehavior)) force += sign * falloff * 1.5;
    if (e.has(DefensiveBehavior)) force += sign * falloff * 1.0;
    if (e.has(MoverBehavior)) force += sign * falloff * 0.4;
    if (e.has(ConsumerBehavior)) force += sign * falloff * 0.5;
  }
  return force;
}
