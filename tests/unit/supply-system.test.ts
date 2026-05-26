import { describe, expect, it } from 'vitest';
import { createEconomy } from '@/game/economy';
import { canTrain, recomputeMaxSupply, SUPPLY_COST } from '@/rules';

describe('supply system', () => {
  it('defines supply costs per unit', () => {
    expect(SUPPLY_COST.Peon).toBe(1);
    expect(SUPPLY_COST.Footman).toBe(2);
  });

  it('canTrain allows a unit within the supply cap', () => {
    const eco = createEconomy(); // maxSupply 5, usedSupply 0
    expect(canTrain(eco, 'Peon')).toBe(true);
  });

  it('canTrain refuses a unit that would exceed the cap', () => {
    const eco = createEconomy();
    eco.usedSupply = 4;
    expect(canTrain(eco, 'Footman')).toBe(false); // 4 + 2 > 5
    expect(canTrain(eco, 'Peon')).toBe(true); // 4 + 1 == 5
  });

  it('recomputeMaxSupply sums building supply contributions', () => {
    // M_FUN.QA.AIVAI.TUNE — baseline of 5 (BASELINE_SUPPLY_CAP)
    // is now added on top of building contributions so a House-less
    // faction can still field the starting kit. Expected = 5 + sum.
    const eco = createEconomy();
    recomputeMaxSupply(eco, ['Palace', 'Farm']);
    expect(eco.maxSupply).toBe(20);
    recomputeMaxSupply(eco, ['Palace', 'Farm', 'Farm']);
    expect(eco.maxSupply).toBe(30);
  });
});
