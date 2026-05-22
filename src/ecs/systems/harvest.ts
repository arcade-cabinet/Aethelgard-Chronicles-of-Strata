import type { World } from 'koota';
import { AssignedJob, Carrier, Harvester, HexPosition, ResourceTrait } from '@/ecs/components';
import { getHexKey } from '@/core/hex';

/** How much one full harvest cycle yields, per resource type. */
const YIELD: Record<string, number> = { wood: 10, stone: 8, gold: 5 };

/**
 * Advance peons in the HARVESTING state. Each tick adds `harvestRate * delta`
 * to the harvest timer; when the timer reaches 1.0 a cycle completes — the
 * Carrier is loaded with the node's resource type, the node's amount drops by
 * the yield, and the peon transitions to CARRYING. If the node is gone or
 * depleted the peon goes IDLE.
 */
export function harvestSystem(world: World, delta: number): void {
  // index resource nodes by hex key
  const nodes = new Map<string, ReturnType<World['query']>[number]>();
  for (const node of world.query(ResourceTrait, HexPosition)) {
    const hex = node.get(HexPosition);
    if (hex) nodes.set(getHexKey(hex.q, hex.r), node);
  }

  world.query(AssignedJob, Harvester, Carrier).updateEach(([job, harvester, carrier], entity) => {
    if (job.state !== 'HARVESTING') return;
    const node = nodes.get(job.targetKey);
    const res = node?.get(ResourceTrait);
    if (!node || !res || res.amount <= 0) {
      job.state = 'IDLE';
      job.targetKey = '';
      return;
    }
    harvester.harvestTimer += harvester.harvestRate * delta;
    if (harvester.harvestTimer >= 1) {
      harvester.harvestTimer = 0;
      const amount = Math.min(YIELD[res.resourceType] ?? 5, res.amount);
      node.set(ResourceTrait, { ...res, amount: res.amount - amount });
      carrier.carryType = res.resourceType;
      carrier.amount = amount;
      job.state = 'CARRYING';
      void entity;
    }
  });
}
