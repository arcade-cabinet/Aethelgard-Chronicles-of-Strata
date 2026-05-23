import type { World } from 'koota';
import { type Discovery, discoveryById } from '@/rules';
import { canAfford, type GameEconomy, spend } from './economy';

/**
 * Research / Discoveries (M_DATA.7) — the tech-tree archetype, spec 102.
 *
 * The 2-item "research" surface is now a thin compatibility layer over the
 * `DISCOVERIES` registry in `@/rules`. Each Discovery's effect is declared
 * in `discovery-registry.ts`; this module owns the per-game purchased state
 * and the apply/spend lifecycle.
 *
 * Adding a Discovery = a new row in `discovery-registry.ts`. No code branches
 * here. The legacy `ResearchId` union is kept narrow to ease the migration;
 * any string id may pass through `applyResearch` and dispatch to the registry.
 */

/** A research / Discovery id. */
export type ResearchId = 'forgedBlades' | 'steelPlows';

/** Which Discoveries have been purchased this session. */
export interface ResearchState {
  /** Purchased Discovery ids. */
  purchased: Set<ResearchId>;
}

/** Create an empty research state. */
export function createResearch(): ResearchState {
  return { purchased: new Set() };
}

/** Whether a Discovery can be purchased — affordable, owned, and prereqs met. */
export function canResearch(
  economy: GameEconomy,
  research: ResearchState,
  id: ResearchId,
): boolean {
  if (research.purchased.has(id)) return false;
  const d = discoveryById(id);
  if (!d) return false;
  if (d.prereqs && !d.prereqs.every((p) => research.purchased.has(p as ResearchId))) return false;
  return canAfford(economy, d.cost);
}

/**
 * Purchase a Discovery — validate, spend, dispatch its `apply(world)` effect,
 * record it as purchased. Dispatches through the registry; no code branches.
 */
export function applyResearch(
  world: World,
  economy: GameEconomy,
  research: ResearchState,
  id: ResearchId,
): boolean {
  const d: Discovery | undefined = discoveryById(id);
  if (!d) return false;
  if (!canResearch(economy, research, id)) return false;
  if (!spend(economy, d.cost)) return false;
  research.purchased.add(id);
  d.apply(world);
  return true;
}
