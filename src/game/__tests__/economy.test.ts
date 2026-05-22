import { describe, expect, it } from 'vitest';
import { addResource, canAfford, createEconomy, spend, supplyUsed } from '@/game/economy';

describe('game economy', () => {
  it('starts with the documented opening resources', () => {
    const eco = createEconomy();
    expect(eco.wood).toBe(50);
    expect(eco.gold).toBe(20);
    expect(eco.stone).toBe(20);
  });

  it('addResource increases a resource total', () => {
    const eco = createEconomy();
    addResource(eco, 'wood', 10);
    expect(eco.wood).toBe(60);
  });

  it('canAfford checks all three resource costs', () => {
    const eco = createEconomy();
    expect(canAfford(eco, { wood: 50, gold: 20, stone: 0 })).toBe(true);
    expect(canAfford(eco, { wood: 51, gold: 0, stone: 0 })).toBe(false);
  });

  it('spend deducts a cost and returns true; refuses when unaffordable', () => {
    const eco = createEconomy();
    expect(spend(eco, { wood: 50, gold: 0, stone: 0 })).toBe(true);
    expect(eco.wood).toBe(0);
    expect(spend(eco, { wood: 1, gold: 0, stone: 0 })).toBe(false);
  });

  it('supplyUsed sums unit supply cost', () => {
    const eco = createEconomy();
    eco.maxSupply = 15;
    expect(supplyUsed(eco)).toBe(0);
    eco.usedSupply = 3;
    expect(supplyUsed(eco)).toBe(3);
  });
});
