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
 *
 * Takes a pre-built stackIndex (stackId → Stack data) so the call is
 * O(1) instead of an O(stacks) scan per peon (CodeRabbit PR #89 —
 * harvestSystem runs the multiplier for every harvesting peon every
 * tick, so a per-tick precompute pays off immediately).
 */
function workCrewMultiplier(
  peon: Entity,
  stackIndex: Map<number, { formationId: string; memberCount: number }>,
): number {
  const member = peon.get(StackMember);
  if (!member) return 1;
  const s = stackIndex.get(member.stackId);
  if (!s || s.formationId !== 'work-crew') return 1;
  const n = Math.min(s.memberCount, 4);
  return 1 + 0.2 * n;
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

  // M_V11.STACK.WORK-CREW.BUFF — index stack entities by id ONCE per
  // tick. workCrewMultiplier looks up in O(1) below.
  const stackIndex = new Map<number, { formationId: string; memberCount: number }>();
  for (const stackEntity of world.query(Stack)) {
    const stack = stackEntity.get(Stack);
    if (!stack) continue;
    stackIndex.set(stackEntity.id(), {
      formationId: stack.formationId,
      memberCount: stack.members.length,
    });
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
    const mult = workCrewMultiplier(peon, stackIndex);
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
