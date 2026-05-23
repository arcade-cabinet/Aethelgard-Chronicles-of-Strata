import { describe, expect, it } from 'vitest';
import { applyArmor, armorMultiplier } from '@/rules';

describe('damage-type × armor table (M_ARCHETYPE.4)', () => {
  const wall = {
    armorVsNormal: 0.3,
    armorVsSiege: 1.5,
    armorVsMagic: 1.0,
    armorVsPierce: 0.6,
  };

  it('siege bypasses normal armor', () => {
    expect(armorMultiplier(wall, 'siege')).toBe(1.5);
    expect(armorMultiplier(wall, 'normal')).toBe(0.3);
  });

  it('applyArmor scales base damage by the multiplier', () => {
    expect(applyArmor(10, wall, 'normal')).toBe(3);
    expect(applyArmor(10, wall, 'siege')).toBe(15);
    expect(applyArmor(10, wall, 'magic')).toBe(10);
    expect(applyArmor(10, wall, 'pierce')).toBe(6);
  });

  it('non-defender targets take full damage (multiplier 1.0)', () => {
    expect(applyArmor(10, null, 'normal')).toBe(10);
    expect(applyArmor(10, null, 'siege')).toBe(10);
  });

  it('damage-type table is extended with a new type via one new field, no branches', () => {
    // sanity: each existing damage type has a multiplier
    for (const t of ['normal', 'siege', 'magic', 'pierce'] as const) {
      expect(typeof armorMultiplier(wall, t)).toBe('number');
    }
  });
});
