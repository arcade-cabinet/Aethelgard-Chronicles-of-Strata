import { describe, expect, it } from 'vitest';
import { createDualPrng } from '@/core/rng';
import { rollDamage } from '@/game/combat-math';

describe('damage roll', () => {
  it('non-crit damage is within [attackDamage, attackDamage + 3]', () => {
    const rng = createDualPrng('ancient-silver-forest').event;
    for (let i = 0; i < 200; i++) {
      const roll = rollDamage(15, rng);
      if (!roll.isCrit) {
        expect(roll.damage).toBeGreaterThanOrEqual(15);
        expect(roll.damage).toBeLessThanOrEqual(18);
      }
    }
  });

  it('crit damage is double the base roll', () => {
    const rng = createDualPrng('ancient-silver-forest').event;
    for (let i = 0; i < 400; i++) {
      const roll = rollDamage(15, rng);
      if (roll.isCrit) {
        expect(roll.damage).toBeGreaterThanOrEqual(30);
        expect(roll.damage).toBeLessThanOrEqual(36);
      }
    }
  });

  it('crit rate is approximately 10% over a large sample', () => {
    const rng = createDualPrng('ancient-silver-forest').event;
    let crits = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      if (rollDamage(15, rng).isCrit) crits += 1;
    }
    expect(crits / n).toBeGreaterThan(0.07);
    expect(crits / n).toBeLessThan(0.13);
  });

  it('is deterministic for a fixed seed', () => {
    const a = createDualPrng('ancient-silver-forest').event;
    const b = createDualPrng('ancient-silver-forest').event;
    expect(rollDamage(15, a)).toEqual(rollDamage(15, b));
  });
});
