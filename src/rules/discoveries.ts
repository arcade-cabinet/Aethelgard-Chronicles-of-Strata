import type { World } from 'koota';
import type { ResourceCost } from '@/game/economy';

/**
 * Discoveries (M_DATA.7 / spec 102) — the tech-tree archetype. Each Discovery
 * is a single config row: an id, cost (any slots — typically science +
 * possibly gold/stone), prereqs, and an `apply(world)` effect that mutates
 * ECS state (raise unit damage, gather rate, unlock a unit/building, etc).
 *
 * Adding a Discovery = adding a row HERE. No code branches anywhere else.
 * This generalizes the prior 2-item `research.ts` into the proper archetype
 * the spec calls for.
 *
 * Costs scale logarithmically by depth in the prereq DAG so complexity ramps
 * naturally as a match progresses (computed elsewhere — the static `cost`
 * here is the BASE cost; runtime multipliers may layer on later).
 */
export interface Discovery {
  /** Stable id used in save state + the HUD. */
  id: string;
  /** Player-facing name. */
  name: string;
  /** One-line description of what the Discovery does in-game. */
  description: string;
  /** Resource cost — typically a science component. */
  cost: ResourceCost;
  /** Other Discovery ids that must be purchased first; empty = no prereqs. */
  prereqs?: ReadonlyArray<string>;
  /** Effect — invoked once when the Discovery is purchased. */
  apply: (world: World) => void;
}
