import type { World } from 'koota';
import { harvestYieldFor } from '@/config/economy';
import { areAdjacent, getHexKey } from '@/core/hex';
import { AssignedJob, Carrier, Harvester, HexPosition, ResourceTrait } from '@/ecs/components';

/**
 * Advance peons in the HARVESTING state. A harvesting peon must be adjacent to
 * (or on) its target node — if it is not, the state is reset to SEEKING so the
 * routing system walks it back. Each tick adds `harvestRate * delta` to the
 * timer; on a full cycle the Carrier is loaded, the node's amount drops by the
 * yield, and the peon transitions to CARRYING. A gone/depleted node sends the
 * peon to IDLE (the routing system re-assigns it next tick).
 */
export function harvestSystem(world: World, delta: number): void {
  // index resource nodes by hex key
  const nodes = new Map<string, ReturnType<World['query']>[number]>();
  for (const node of world.query(ResourceTrait, HexPosition)) {
    const hex = node.get(HexPosition);
    if (hex) nodes.set(getHexKey(hex.q, hex.r), node);
  }

  world
    .query(AssignedJob, Harvester, Carrier, HexPosition)
    .updateEach(([job, harvester, carrier, hex]) => {
      if (job.state !== 'HARVESTING') return;
      const node = nodes.get(job.targetKey);
      const res = node?.get(ResourceTrait);
      if (!node || !res || res.amount <= 0) {
        job.state = 'IDLE';
        job.targetKey = '';
        return;
      }
      // hard adjacency guard — never harvest from a distance
      const peonKey = getHexKey(hex.q, hex.r);
      if (peonKey !== job.targetKey && !areAdjacent(peonKey, job.targetKey)) {
        job.state = 'SEEKING';
        harvester.harvestTimer = 0;
        return;
      }
      harvester.harvestTimer += harvester.harvestRate * delta;
      if (harvester.harvestTimer >= 1) {
        harvester.harvestTimer = 0;
        const amount = Math.min(harvestYieldFor(res.resourceType), res.amount);
        node.set(ResourceTrait, { ...res, amount: res.amount - amount });
        carrier.carryType = res.resourceType;
        carrier.amount = amount;
        job.state = 'CARRYING';
      }
    });

  // M_HARDENING.3 — auto-destroy depleted nodes. ResourceTrait at amount=0
  // is dead; leaving it in the world means every per-tick query walks it.
  // Sweep once at the end so a node depleted THIS tick still scored its
  // final harvest above.
  for (const node of world.query(ResourceTrait)) {
    if ((node.get(ResourceTrait)?.amount ?? 0) <= 0) node.destroy();
  }
}
