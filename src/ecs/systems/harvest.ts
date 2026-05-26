import type { Entity, World } from 'koota';
import { harvestYieldFor } from '@/config/economy';
import { areAdjacent, getHexKey } from '@/core/hex';
import {
  AssignedJob,
  Carrier,
  Harvester,
  HexPosition,
  ResourceTrait,
  Stack,
  StackMember,
} from '@/ecs/components';

/**
 * M_V11.STACK.WORK-CREW.BUFF — harvest-rate multiplier for a peon
 * that's a StackMember of a 'work-crew' Stack. Spec: +20% per
 * member, capped at +80% (4-member buff). Solo peons unaffected.
 */
function workCrewMultiplier(world: World, peon: Entity): number {
  const member = peon.get(StackMember);
  if (!member) return 1;
  for (const stackEntity of world.query(Stack)) {
    if (stackEntity.id() !== member.stackId) continue;
    const stack = stackEntity.get(Stack);
    if (!stack || stack.formationId !== 'work-crew') return 1;
    const n = Math.min(stack.members.length, 4);
    return 1 + 0.2 * n;
  }
  return 1;
}

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

  for (const peon of world.query(AssignedJob, Harvester, Carrier, HexPosition)) {
    const job = peon.get(AssignedJob);
    const harvester = peon.get(Harvester);
    const carrier = peon.get(Carrier);
    const hex = peon.get(HexPosition);
    if (!job || !harvester || !carrier || !hex) continue;
    if (job.state !== 'HARVESTING') continue;
    const node = nodes.get(job.targetKey);
    const res = node?.get(ResourceTrait);
    if (!node || !res || res.amount <= 0) {
      peon.set(AssignedJob, { ...job, state: 'IDLE', targetKey: '' });
      continue;
    }
    // hard adjacency guard — never harvest from a distance
    const peonKey = getHexKey(hex.q, hex.r);
    if (peonKey !== job.targetKey && !areAdjacent(peonKey, job.targetKey)) {
      peon.set(AssignedJob, { ...job, state: 'SEEKING' });
      peon.set(Harvester, { ...harvester, harvestTimer: 0 });
      continue;
    }
    // M_V11.STACK.WORK-CREW.BUFF — scale per-tick increment by the
    // work-crew multiplier (1.0 solo, 1.2 / 1.4 / 1.6 / 1.8 for
    // 1..4 members; spec cap at +80%).
    const mult = workCrewMultiplier(world, peon);
    const nextTimer = harvester.harvestTimer + harvester.harvestRate * delta * mult;
    if (nextTimer >= 1) {
      peon.set(Harvester, { ...harvester, harvestTimer: 0 });
      const amount = Math.min(harvestYieldFor(res.resourceType), res.amount);
      node.set(ResourceTrait, { ...res, amount: res.amount - amount });
      peon.set(Carrier, { ...carrier, carryType: res.resourceType, amount });
      peon.set(AssignedJob, { ...job, state: 'CARRYING' });
    } else {
      peon.set(Harvester, { ...harvester, harvestTimer: nextTimer });
    }
  }

  // M_HARDENING.3 — auto-destroy depleted nodes. ResourceTrait at amount=0
  // is dead; leaving it in the world means every per-tick query walks it.
  // Sweep once at the end so a node depleted THIS tick still scored its
  // final harvest above.
  for (const node of world.query(ResourceTrait)) {
    if ((node.get(ResourceTrait)?.amount ?? 0) <= 0) node.destroy();
  }
}
