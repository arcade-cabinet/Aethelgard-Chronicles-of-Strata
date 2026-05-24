import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { createEconomy } from '@/game/economy';
import {
  BUILDING_COSTS,
  canAddPeon,
  canBuild,
  canTrain,
  peonCap,
  recomputeMaxSupply,
  SUPPLY_COST,
} from '@/rules';

describe('rules engine barrel (M8.6b, spec 101)', () => {
  it('exposes building costs and supply costs', () => {
    expect(BUILDING_COSTS.Farm.wood).toBeGreaterThan(0);
    expect(SUPPLY_COST.Peon).toBeGreaterThan(0);
  });

  it('canBuild rejects an occupied tile and accepts a free buildable one', () => {
    const board = generateBoard('ancient-silver-forest');
    const grass = [...board.tiles.values()].find((t) => t.type === 'GRASS' && t.walkable);
    if (!grass) throw new Error('no grass tile');
    const key = `${grass.q},${grass.r}`;
    const eco = createEconomy();
    eco.wood = 9999;
    eco.stone = 9999;
    eco.gold = 9999;
    expect(canBuild(board, new Set(), key, 'Farm', eco).ok).toBe(true);
    expect(canBuild(board, new Set([key]), key, 'Farm', eco).ok).toBe(false);
  });

  it('canTrain respects the supply cap', () => {
    const eco = createEconomy();
    eco.usedSupply = 0;
    eco.maxSupply = 5;
    expect(canTrain(eco, 'Peon')).toBe(true);
    eco.usedSupply = 5;
    expect(canTrain(eco, 'Footman')).toBe(false);
  });

  it('recomputeMaxSupply sums the contributions of complete buildings', () => {
    const eco = createEconomy();
    recomputeMaxSupply(eco, ['TownHall', 'Farm']);
    const twoBuildings = eco.maxSupply;
    recomputeMaxSupply(eco, ['TownHall', 'Farm', 'Farm']);
    expect(eco.maxSupply).toBeGreaterThan(twoBuildings);
  });

  it('peonCap grows with houses and granaries', () => {
    const base = peonCap(0, 0);
    expect(base).toBeGreaterThan(0);
    expect(peonCap(2, 0)).toBeGreaterThan(base);
    expect(peonCap(0, 2)).toBeGreaterThan(base);
    expect(peonCap(2, 2)).toBeGreaterThan(peonCap(2, 0));
  });

  it('canAddPeon gates on the peon cap', () => {
    // base cap with no houses/granaries
    const cap = peonCap(0, 0);
    expect(canAddPeon(cap - 1, 0, 0)).toBe(true);
    expect(canAddPeon(cap, 0, 0)).toBe(false);
    // a house raises the ceiling
    expect(canAddPeon(cap, 1, 0)).toBe(true);
  });
});
