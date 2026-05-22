import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { canBuild, BUILDING_COSTS } from '@/rules';
import { createEconomy } from '@/game/economy';

describe('build mode placement validation', () => {
  it('rejects placement on an ocean tile', () => {
    const board = generateBoard('ancient-silver-forest');
    const ocean = [...board.tiles.values()].find((t) => t.type === 'OCEAN');
    if (!ocean) throw new Error('seed has no ocean tile');
    expect(canBuild(board, new Set(), `${ocean.q},${ocean.r}`, 'Farm', createEconomy()).ok).toBe(
      false,
    );
  });

  it('rejects placement on an occupied tile', () => {
    const board = generateBoard('ancient-silver-forest');
    const grass = [...board.tiles.values()].find((t) => t.type === 'GRASS');
    if (!grass) throw new Error('seed has no grass tile');
    const key = `${grass.q},${grass.r}`;
    const eco = createEconomy();
    eco.wood = 1000;
    eco.gold = 1000;
    expect(canBuild(board, new Set([key]), key, 'Farm', eco).ok).toBe(false);
  });

  it('rejects placement the player cannot afford', () => {
    const board = generateBoard('ancient-silver-forest');
    const grass = [...board.tiles.values()].find((t) => t.type === 'GRASS');
    if (!grass) throw new Error('seed has no grass tile');
    // default economy (50 wood) cannot afford a Farm (100 wood)
    expect(canBuild(board, new Set(), `${grass.q},${grass.r}`, 'Farm', createEconomy()).ok).toBe(
      false,
    );
  });

  it('accepts placement on a free grass tile with sufficient resources', () => {
    const board = generateBoard('ancient-silver-forest');
    const grass = [...board.tiles.values()].find((t) => t.type === 'GRASS');
    if (!grass) throw new Error('seed has no grass tile');
    const eco = createEconomy();
    eco.wood = 1000;
    eco.gold = 1000;
    expect(canBuild(board, new Set(), `${grass.q},${grass.r}`, 'Farm', eco).ok).toBe(true);
  });

  it('defines costs for Farm and Barracks', () => {
    expect(BUILDING_COSTS.Farm.wood).toBe(100);
    expect(BUILDING_COSTS.Barracks.stone).toBe(100);
  });
});
