import { describe, expect, it } from 'vitest';
import { createEconomy } from '@/game/economy';
import { SUPPLY_COST, canTrain, recomputeMaxSupply } from '@/rules';

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
    const eco = createEconomy();
    recomputeMaxSupply(eco, ['TownHall', 'Farm']);
    expect(eco.maxSupply).toBe(15);
    recomputeMaxSupply(eco, ['TownHall', 'Farm', 'Farm']);
    expect(eco.maxSupply).toBe(25);
  });
});
