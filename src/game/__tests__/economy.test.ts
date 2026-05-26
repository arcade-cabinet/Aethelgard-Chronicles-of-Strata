import { describe, expect, it } from 'vitest';
import { addResource, canAfford, createEconomy, spend, supplyUsed } from '@/game/economy';

// M_V11.OPEN.STOCKPILE — opening stockpile updated to 80/60/0
// (wood/stone/gold) per the classic-RTS opening spec. Pre-v0.11
// was 50/20/20.
describe('game economy', () => {
  it('starts with the documented opening resources', () => {
    const eco = createEconomy();
    expect(eco.wood).toBe(80);
    expect(eco.gold).toBe(0);
    expect(eco.stone).toBe(60);
  });

  it('addResource increases a resource total', () => {
    const eco = createEconomy();
    addResource(eco, 'wood', 10);
    expect(eco.wood).toBe(90);
  });

  it('canAfford checks all three resource costs', () => {
    const eco = createEconomy();
    expect(canAfford(eco, { wood: 80, gold: 0, stone: 60 })).toBe(true);
    expect(canAfford(eco, { wood: 81, gold: 0, stone: 0 })).toBe(false);
  });

  it('spend deducts a cost and returns true; refuses when unaffordable', () => {
    const eco = createEconomy();
    expect(spend(eco, { wood: 80, gold: 0, stone: 0 })).toBe(true);
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
