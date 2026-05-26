/**
 * M_V11.STACK.WORK-CREW.BUFF — harvest-rate buff tests.
 *
 * Verifies:
 *   1. Solo peon (no StackMember) ticks at base rate.
 *   2. 2-member work-crew ticks at +40% rate (capped formula).
 *   3. 4-member work-crew ticks at +80% rate (cap reached).
 *   4. 5-member work-crew ALSO ticks at +80% (cap holds beyond 4).
 *   5. Non-work-crew Stack (e.g. Rabble) → solo rate (no buff).
 */
import { createWorld, type World } from 'koota';
import { describe, expect, it } from 'vitest';
import {
  AssignedJob,
  Carrier,
  Combatant,
  FactionTrait,
  Harvester,
  Health,
  HexPosition,
  ResourceTrait,
  Stack,
  StackMember,
  Unit,
} from '@/ecs/components';
import { harvestSystem } from '@/ecs/systems/harvest';

function spawnPeon(world: World, q: number, r: number) {
  const e = world.spawn(Unit, FactionTrait, AssignedJob, Harvester, Carrier, HexPosition);
  e.set(Unit, { unitType: 'Peon' });
  e.set(FactionTrait, { faction: 'player' });
  e.set(AssignedJob, { state: 'HARVESTING', targetKey: `${q},${r}` });
  e.set(Harvester, { harvestRate: 1, harvestTimer: 0 });
  e.set(Carrier, { carryType: 'none', amount: 0 });
  e.set(HexPosition, { q, r, level: 0 });
  return e;
}

function spawnNode(world: World, q: number, r: number) {
  const e = world.spawn(ResourceTrait, HexPosition);
  e.set(ResourceTrait, { resourceType: 'wood', amount: 1000 });
  e.set(HexPosition, { q, r, level: 0 });
  return e;
}

function attachStack(
  world: World,
  members: ReturnType<typeof spawnPeon>[],
  formationId: 'work-crew' | 'rabble',
) {
  const stack = world.spawn(Stack);
  stack.set(Stack, {
    members: members.map((m) => m.id()),
    formationId,
    combinedHp: members.length * 100,
    combinedMaxHp: members.length * 100,
    combinedDps: 0,
    dominantUnitType: 'Peon',
  });
  for (const m of members) {
    m.add(StackMember);
    m.set(StackMember, { stackId: stack.id() });
  }
  return stack;
}

describe('M_V11.STACK.WORK-CREW.BUFF', () => {
  it('solo peon — base rate', () => {
    const world = createWorld();
    spawnNode(world, 0, 0);
    const peon = spawnPeon(world, 0, 0);
    harvestSystem(world, 0.5);
    expect(peon.get(Harvester)?.harvestTimer).toBeCloseTo(0.5, 3);
  });

  it('2-member work-crew → +40% rate', () => {
    const world = createWorld();
    spawnNode(world, 0, 0);
    const a = spawnPeon(world, 0, 0);
    const b = spawnPeon(world, 0, 0);
    attachStack(world, [a, b], 'work-crew');
    harvestSystem(world, 0.5);
    expect(a.get(Harvester)?.harvestTimer).toBeCloseTo(0.5 * 1.4, 3);
  });

  it('4-member work-crew → +80% rate (cap reached)', () => {
    const world = createWorld();
    spawnNode(world, 0, 0);
    const peons = [
      spawnPeon(world, 0, 0),
      spawnPeon(world, 0, 0),
      spawnPeon(world, 0, 0),
      spawnPeon(world, 0, 0),
    ];
    attachStack(world, peons, 'work-crew');
    harvestSystem(world, 0.5);
    expect(peons[0]?.get(Harvester)?.harvestTimer).toBeCloseTo(0.5 * 1.8, 3);
  });

  it('5-member work-crew → caps at +80% (no extra growth)', () => {
    const world = createWorld();
    spawnNode(world, 0, 0);
    const peons = Array.from({ length: 5 }, () => spawnPeon(world, 0, 0));
    attachStack(world, peons, 'work-crew');
    harvestSystem(world, 0.5);
    expect(peons[0]?.get(Harvester)?.harvestTimer).toBeCloseTo(0.5 * 1.8, 3);
  });

  it('rabble stack → no buff (only work-crew triggers)', () => {
    const world = createWorld();
    spawnNode(world, 0, 0);
    // Combatant is unused here but createStack-style stacks have it
    // on military members; the buff only checks formationId.
    const a = spawnPeon(world, 0, 0);
    const b = spawnPeon(world, 0, 0);
    a.add(Combatant); // dummy
    a.set(Combatant, { attackDamage: 0, attackRange: 0, attackCooldown: 1, attackTimer: 0 });
    a.add(Health);
    a.set(Health, { current: 100, max: 100 });
    b.add(Combatant);
    b.set(Combatant, { attackDamage: 0, attackRange: 0, attackCooldown: 1, attackTimer: 0 });
    b.add(Health);
    b.set(Health, { current: 100, max: 100 });
    attachStack(world, [a, b], 'rabble');
    harvestSystem(world, 0.5);
    expect(a.get(Harvester)?.harvestTimer).toBeCloseTo(0.5, 3);
  });
});
