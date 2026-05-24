import { describe, expect, it } from 'vitest';
import { createEventPrng } from '@/core/rng';
import { Combatant, EnemyTarget, Health, HexPosition, Unit } from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { createEcsWorld } from '@/ecs/world';
import { WEATHER_PROFILES } from '@/game/weather';

/**
 * M_EXPANSION.T.135 — weather combat modifiers. Tests verify:
 * - rain reduces ranged accuracy (Wizard misses some fraction)
 * - melee strikes ignore weather (sword Footman always lands)
 * - sunny baseline produces full damage
 *
 * Determinism: same seed + same weather → same damage roll
 * sequence; the miss roll consumes the next eventRng draw.
 */
describe('M_EXPANSION.T.135 — weather combat modifiers', () => {
  it('WEATHER_PROFILES carries rangedAccuracyMultiplier + visionMultiplier per state', () => {
    expect(WEATHER_PROFILES.sunny.rangedAccuracyMultiplier).toBe(1);
    expect(WEATHER_PROFILES.sunny.visionMultiplier).toBe(1);
    expect(WEATHER_PROFILES.rain.rangedAccuracyMultiplier).toBe(0.7);
    expect(WEATHER_PROFILES.fog.visionMultiplier).toBe(0.5);
  });

  it('ranged attack in rain misses a meaningful fraction (≥15% of 200)', () => {
    const world = createEcsWorld();
    let zeroDamageHits = 0;
    let totalHits = 0;
    for (let i = 0; i < 200; i++) {
      const target = world.spawn(
        HexPosition({ q: 4, r: 0, level: 2 }),
        Health({ current: 1000, max: 1000 }),
        Unit({ unitType: 'Goblin' }),
      );
      world.spawn(
        HexPosition({ q: 0, r: 0, level: 2 }),
        // Wizard = ranged (meleeWeapon 'none' + attackRange > 1)
        Combatant({ attackDamage: 10, attackRange: 4, attackCooldown: 1, attackTimer: 0 }),
        EnemyTarget({ targetId: Number(target) }),
        Unit({ unitType: 'Wizard' }),
      );
      const rng = createEventPrng(`rain-miss-${i}`);
      const events = combatSystem(world, rng, 1, WEATHER_PROFILES.rain.rangedAccuracyMultiplier);
      for (const ev of events) {
        totalHits += 1;
        if (ev.damage === 0 && !ev.parried) zeroDamageHits += 1;
      }
      target.destroy();
      // destroy attacker too — query the only Wizard
      for (const e of world.query(Unit)) {
        if (e.get(Unit)?.unitType === 'Wizard') e.destroy();
      }
    }
    expect(totalHits).toBeGreaterThan(0);
    // ~30% miss rate over 200 runs; allow wide band (15%-50%).
    const missRate = zeroDamageHits / totalHits;
    expect(missRate).toBeGreaterThan(0.15);
    expect(missRate).toBeLessThan(0.5);
  });

  it('melee strike in rain ALWAYS lands (weather ignores melee)', () => {
    const world = createEcsWorld();
    let zeroDamageHits = 0;
    for (let i = 0; i < 50; i++) {
      const target = world.spawn(
        HexPosition({ q: 1, r: 0, level: 2 }),
        Health({ current: 1000, max: 1000 }),
        Unit({ unitType: 'Goblin' }),
      );
      world.spawn(
        HexPosition({ q: 0, r: 0, level: 2 }),
        // Footman = melee (meleeWeapon 'sword' + attackRange 1)
        Combatant({ attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
        EnemyTarget({ targetId: Number(target) }),
        Unit({ unitType: 'Footman' }),
      );
      const rng = createEventPrng(`melee-rain-${i}`);
      const events = combatSystem(world, rng, 1, 0.7);
      for (const ev of events) {
        if (ev.damage === 0 && !ev.parried) zeroDamageHits += 1;
      }
      target.destroy();
      for (const e of world.query(Unit)) {
        if (e.get(Unit)?.unitType === 'Footman') e.destroy();
      }
    }
    // Melee never weather-misses; the only 0-damage events are parries.
    expect(zeroDamageHits).toBe(0);
  });

  it('sunny weather (rangedAccuracy=1) never produces weather-misses', () => {
    const world = createEcsWorld();
    let zeroDamageHits = 0;
    for (let i = 0; i < 50; i++) {
      const target = world.spawn(
        HexPosition({ q: 4, r: 0, level: 2 }),
        Health({ current: 1000, max: 1000 }),
        Unit({ unitType: 'Goblin' }),
      );
      world.spawn(
        HexPosition({ q: 0, r: 0, level: 2 }),
        Combatant({ attackDamage: 10, attackRange: 4, attackCooldown: 1, attackTimer: 0 }),
        EnemyTarget({ targetId: Number(target) }),
        Unit({ unitType: 'Wizard' }),
      );
      const rng = createEventPrng(`sunny-${i}`);
      const events = combatSystem(world, rng, 1, 1.0);
      for (const ev of events) {
        if (ev.damage === 0 && !ev.parried) zeroDamageHits += 1;
      }
      target.destroy();
      for (const e of world.query(Unit)) {
        if (e.get(Unit)?.unitType === 'Wizard') e.destroy();
      }
    }
    // Sunny = no weather-miss; the only 0-damage paths are parries (none here).
    expect(zeroDamageHits).toBe(0);
  });
});
