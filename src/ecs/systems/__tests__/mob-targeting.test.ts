/**
 * M_V11.CAMPS.HOSTILE-ALL — mobTargetingSystem tests.
 *
 * Verifies:
 *   1. A barbarian-camp-N mob targets a nearby player unit.
 *   2. A barbarian-camp-N mob targets a nearby ENEMY unit (other
 *      player faction) — not just 'player'.
 *   3. A barbarian-camp-1 mob does NOT target a barbarian-camp-1
 *      sibling (no friendly fire within a camp).
 *   4. A barbarian-camp-1 mob DOES target a barbarian-camp-2 mob
 *      (different camps fight each other).
 *   5. Out-of-aggro candidates are ignored.
 */
import { createWorld, type World } from 'koota';
import { describe, expect, it } from 'vitest';
import {
  Combatant,
  EnemyTarget,
  FactionTrait,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { mobTargetingSystem } from '@/ecs/systems/mob-targeting';

function spawnMob(world: World, faction: string, q: number, r: number) {
  const e = world.spawn(Combatant, FactionTrait, Health, HexPosition, EnemyTarget, Unit);
  e.set(Combatant, { attackDamage: 6, attackRange: 1, attackCooldown: 1.4, attackTimer: 0 });
  e.set(FactionTrait, { faction: faction as 'player' | 'enemy' });
  e.set(Health, { current: 30, max: 30 });
  e.set(HexPosition, { q, r, level: 0 });
  e.set(EnemyTarget, { targetId: -1 });
  e.set(Unit, { unitType: 'Goblin' });
  return e;
}
function spawnPlayer(world: World, faction: string, q: number, r: number) {
  const e = world.spawn(Combatant, FactionTrait, Health, HexPosition, EnemyTarget, Unit);
  e.set(Combatant, { attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0 });
  e.set(FactionTrait, { faction: faction as 'player' | 'enemy' });
  e.set(Health, { current: 100, max: 100 });
  e.set(HexPosition, { q, r, level: 0 });
  e.set(EnemyTarget, { targetId: -1 });
  e.set(Unit, { unitType: 'Footman' });
  return e;
}

describe('mobTargetingSystem (M_V11.CAMPS.HOSTILE-ALL)', () => {
  it('camp mob targets nearby player', () => {
    const world = createWorld();
    const mob = spawnMob(world, 'barbarian-camp-1', 0, 0);
    const foot = spawnPlayer(world, 'player', 2, 0);
    mobTargetingSystem(world);
    expect(mob.get(EnemyTarget)?.targetId).toBe(Number(foot));
  });

  it('camp mob targets nearby enemy faction (not just player)', () => {
    const world = createWorld();
    const mob = spawnMob(world, 'barbarian-camp-1', 0, 0);
    const aiFoot = spawnPlayer(world, 'enemy', 2, 0);
    mobTargetingSystem(world);
    expect(mob.get(EnemyTarget)?.targetId).toBe(Number(aiFoot));
  });

  it('camp mob does NOT target same-camp siblings', () => {
    const world = createWorld();
    const mob = spawnMob(world, 'barbarian-camp-1', 0, 0);
    spawnMob(world, 'barbarian-camp-1', 1, 0); // sibling
    mobTargetingSystem(world);
    expect(mob.get(EnemyTarget)?.targetId).toBe(-1);
  });

  it('camp mob DOES target different-camp mobs', () => {
    const world = createWorld();
    const mob = spawnMob(world, 'barbarian-camp-1', 0, 0);
    const rival = spawnMob(world, 'barbarian-camp-2', 2, 0);
    mobTargetingSystem(world);
    expect(mob.get(EnemyTarget)?.targetId).toBe(Number(rival));
  });

  it('ignores candidates beyond aggro radius', () => {
    const world = createWorld();
    const mob = spawnMob(world, 'barbarian-camp-1', 0, 0);
    spawnPlayer(world, 'player', 50, 0); // far away
    mobTargetingSystem(world);
    expect(mob.get(EnemyTarget)?.targetId).toBe(-1);
  });
});
