import type { World } from 'koota';
import { Combatant, Harvester } from '@/ecs/components';
import { type GameEconomy, type ResourceCost, canAfford, spend } from './economy';

/** A research upgrade id. */
export type ResearchId = 'forgedBlades' | 'steelPlows';

/** Which upgrades have been purchased this session. */
export interface ResearchState {
  /** Purchased upgrade ids. */
  purchased: Set<ResearchId>;
}

/** Resource cost per research. Source: 70-rts-systems.md §Research System. */
export const RESEARCH_COST: Record<ResearchId, ResourceCost> = {
  forgedBlades: { wood: 0, stone: 100, gold: 150 },
  steelPlows: { wood: 50, stone: 0, gold: 100 },
};

/** Create an empty research state. */
export function createResearch(): ResearchState {
  return { purchased: new Set() };
}

/** Whether an upgrade can be purchased — affordable and not already owned. */
export function canResearch(
  economy: GameEconomy,
  research: ResearchState,
  id: ResearchId,
): boolean {
  if (research.purchased.has(id)) return false;
  return canAfford(economy, RESEARCH_COST[id]);
}

/**
 * Purchase and apply a research upgrade. Forged Blades raises every Combatant's
 * attackDamage by 5; Steel Plows multiplies every Harvester's rate by 1.5.
 * No-ops if unaffordable or already owned.
 */
export function applyResearch(
  world: World,
  economy: GameEconomy,
  research: ResearchState,
  id: ResearchId,
): boolean {
  if (!canResearch(economy, research, id)) return false;
  if (!spend(economy, RESEARCH_COST[id])) return false;
  research.purchased.add(id);
  if (id === 'forgedBlades') {
    world.query(Combatant).updateEach(([c]) => {
      c.attackDamage += 5;
    });
  } else {
    world.query(Harvester).updateEach(([h]) => {
      h.harvestRate *= 1.5;
    });
  }
  return true;
}
