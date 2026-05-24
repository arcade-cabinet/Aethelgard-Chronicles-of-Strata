import { describe, expect, it } from 'vitest';
import { UNIT_PROFILES } from '@/rules/unit-profiles';
import { UNIT_COSTS, type TrainableUnit } from '@/rules/economy-rules';
import { BASE_UNIT_VISION_RADIUS } from '@/game/zone';
import type { UnitType } from '@/ecs/components';

/**
 * M_POLISH2.RTS.22 — Scout unit contract tests.
 *
 * Pins:
 *  1. Scout has 2× vision radius (via visionRadiusMultiplier).
 *  2. Scout has 0 attack damage and 0 attack range (non-combat).
 *  3. Scout costs 30 wood, 0 stone, 0 gold.
 *  4. 'Scout' is a valid UnitType (present in UNIT_PROFILES).
 *  5. 'Scout' is in the TrainableUnit union (UNIT_COSTS record has Scout key).
 *  6. Scout is nonCombat with combatRole 'civilian'.
 */
describe('M_POLISH2.RTS.22 — Scout unit', () => {
  it('Scout has visionRadiusMultiplier of 2 (double the baseline vision)', () => {
    const profile = UNIT_PROFILES.Scout;
    expect(profile.visionRadiusMultiplier).toBe(2);
    // Verify that double the BASE radius equals 2× whatever the baseline is.
    // This pins the effective vision radius contract regardless of config tuning.
    const effectiveRadius = BASE_UNIT_VISION_RADIUS * (profile.visionRadiusMultiplier ?? 1);
    expect(effectiveRadius).toBe(BASE_UNIT_VISION_RADIUS * 2);
  });

  it('Scout has 0 attack damage and 0 attack range (pure recon unit)', async () => {
    const { unitStatFor } = await import('@/config/combat');
    const stats = unitStatFor('Scout');
    expect(stats.attackDamage).toBe(0);
    expect(stats.attackRange).toBe(0);
  });

  it('Scout costs 30 wood with 0 stone and 0 gold', () => {
    const cost = UNIT_COSTS['Scout' as TrainableUnit];
    expect(cost.wood).toBe(30);
    expect(cost.stone).toBe(0);
    expect(cost.gold).toBe(0);
  });

  it('Scout is in UNIT_PROFILES (valid UnitType)', () => {
    const unitTypes = Object.keys(UNIT_PROFILES) as UnitType[];
    expect(unitTypes).toContain('Scout');
  });

  it('Scout is in UNIT_COSTS (trainable unit)', () => {
    const trainableKeys = Object.keys(UNIT_COSTS);
    expect(trainableKeys).toContain('Scout');
  });

  it('Scout is nonCombat and civilian combatRole', () => {
    const profile = UNIT_PROFILES.Scout;
    expect(profile.nonCombat).toBe(true);
    expect(profile.combatRole).toBe('civilian');
  });

  it('Scout has no melee weapon and 0 parry chance', () => {
    const profile = UNIT_PROFILES.Scout;
    expect(profile.meleeWeapon).toBe('none');
    expect(profile.parryChance).toBe(0);
  });
});
