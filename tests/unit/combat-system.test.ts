import { describe, expect, it } from 'vitest';
import { createEventPrng } from '@/core/rng';
import { Combatant, EnemyTarget, Health, HexPosition } from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { createEcsWorld } from '@/ecs/world';

describe('combat system', () => {
  it('an in-range attacker damages its target when the cooldown fires', () => {
    const world = createEcsWorld();
    const target = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      Health({ current: 60, max: 60 }),
    );
    const attacker = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: Number(target) }),
    );
    void attacker;
    const rng = createEventPrng('ancient-silver-forest');
    combatSystem(world, rng, 1); // a full second — one attack
    expect(target.get(Health)?.current).toBeLessThan(60);
  });

  it('does not attack a target out of range', () => {
    const world = createEcsWorld();
    const target = world.spawn(
      HexPosition({ q: 9, r: 0, level: 2 }),
      Health({ current: 60, max: 60 }),
    );
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: Number(target) }),
    );
    const rng = createEventPrng('ancient-silver-forest');
    combatSystem(world, rng, 1);
    expect(target.get(Health)?.current).toBe(60);
  });

  it('respects the cooldown — no damage before the timer elapses', () => {
    const world = createEcsWorld();
    const target = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      Health({ current: 60, max: 60 }),
    );
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: Number(target) }),
    );
    const rng = createEventPrng('ancient-silver-forest');
    combatSystem(world, rng, 0.1); // well under the 1s cooldown
    expect(target.get(Health)?.current).toBe(60);
  });

  it('clears EnemyTarget when the target is already dead', () => {
    const world = createEcsWorld();
    const attacker = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: 99999 }), // non-existent entity
    );
    const rng = createEventPrng('ancient-silver-forest');
    combatSystem(world, rng, 1);
    expect(attacker.get(EnemyTarget)?.targetId).toBe(-1);
  });
});
