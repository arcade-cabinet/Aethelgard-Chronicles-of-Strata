import { describe, expect, it } from 'vitest';
import { createEventPrng } from '@/core/rng';
import { Combatant, EnemyTarget, Health, HexPosition, Unit } from '@/ecs/components';
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

  // M_POLISH.3 — sword melee strikes carry the isMeleeSword flag so
  // audio can swap to the bright sword-clash cue; ranged + magic do
  // NOT carry it; clubs do not carry it.
  it('flags isMeleeSword on a Footman vs Goblin melee tick', () => {
    const world = createEcsWorld();
    const target = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      Health({ current: 60, max: 60 }),
      Unit({ unitType: 'Goblin' }),
    );
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: Number(target) }),
      Unit({ unitType: 'Footman' }),
    );
    const rng = createEventPrng('ancient-silver-forest');
    const events = combatSystem(world, rng, 1);
    expect(events.length).toBeGreaterThan(0);
    const first = events[0];
    expect(first).toBeDefined();
    expect(first?.isMeleeSword).toBe(true);
    expect(first?.parried).toBe(false);
  });

  // M_EXPANSION.AU.46 — a Footman defending against a sword strike
  // has parryChance=0.1; over 1000 sword strikes we expect roughly
  // 100 parries — the only test that needs determinism around the
  // RNG sequence (assert the bucket, not the exact count).
  it('parries roughly 10% of incoming sword strikes on a Footman', () => {
    // Single world; destroy entities between iterations to stay under
    // the koota 16-world cap. The world.reset()-equivalent here is
    // .destroy() on each spawned entity.
    const world = createEcsWorld();
    let parryCount = 0;
    let totalEvents = 0;
    const RUNS = 200;
    for (let i = 0; i < RUNS; i++) {
      const target = world.spawn(
        HexPosition({ q: 1, r: 0, level: 2 }),
        Health({ current: 1000, max: 1000 }),
        Unit({ unitType: 'Footman' }),
      );
      const attacker = world.spawn(
        HexPosition({ q: 0, r: 0, level: 2 }),
        Combatant({ attackDamage: 1, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
        EnemyTarget({ targetId: Number(target) }),
        Unit({ unitType: 'Footman' }),
      );
      const rng = createEventPrng(`parry-test-${i}`);
      const events = combatSystem(world, rng, 1);
      totalEvents += events.length;
      if (events.some((e) => e.parried)) parryCount += 1;
      target.destroy();
      attacker.destroy();
    }
    // Expected ~10% parry rate. 200 runs ⇒ ~20 parries.
    expect(totalEvents).toBe(RUNS);
    expect(parryCount).toBeGreaterThan(5);
    expect(parryCount).toBeLessThan(45);
  });

  // M_POLISH.3 — a club-wielding Goblin attacking does NOT trigger a
  // parry roll on the defending Footman (parry shields against
  // bladed weapons, not bludgeons — keeps the cue meaningful).
  it('a Goblin (club) attacker does not invoke the Footman parry', () => {
    const world = createEcsWorld();
    const target = world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      Health({ current: 60, max: 60 }),
      Unit({ unitType: 'Footman' }),
    );
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Combatant({ attackDamage: 15, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
      EnemyTarget({ targetId: Number(target) }),
      Unit({ unitType: 'Goblin' }),
    );
    const rng = createEventPrng('ancient-silver-forest');
    const events = combatSystem(world, rng, 1);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.parried).toBe(false);
    expect(events[0]?.isMeleeSword).toBe(false);
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
