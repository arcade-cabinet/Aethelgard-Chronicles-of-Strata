import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { createDualPrng } from '@/core/rng';
import { spawnResourceNodes } from '@/world/resource-spawn';

describe('resource node spawning', () => {
  it('is deterministic for a given seed', () => {
    const a = spawnResourceNodes(generateBoard('ancient-silver-forest'), createDualPrng('ancient-silver-forest').map);
    const b = spawnResourceNodes(generateBoard('ancient-silver-forest'), createDualPrng('ancient-silver-forest').map);
    expect(a.map((n) => n.key)).toEqual(b.map((n) => n.key));
  });

  it('places wood nodes only on forest tiles', () => {
    const board = generateBoard('ancient-silver-forest');
    const nodes = spawnResourceNodes(board, createDualPrng('ancient-silver-forest').map);
    for (const node of nodes) {
      if (node.resourceType === 'wood') {
        expect(board.tiles.get(node.key)?.type).toBe('FOREST');
      }
    }
  });

  it('produces at least one node of every resource type', () => {
    const board = generateBoard('ancient-silver-forest');
    const nodes = spawnResourceNodes(board, createDualPrng('ancient-silver-forest').map);
    const types = new Set(nodes.map((n) => n.resourceType));
    expect(types.has('wood')).toBe(true);
    expect(types.has('stone')).toBe(true);
    expect(types.has('gold')).toBe(true);
  });

  it('never places two nodes on the same tile', () => {
    const board = generateBoard('ancient-silver-forest');
    const nodes = spawnResourceNodes(board, createDualPrng('ancient-silver-forest').map);
    const keys = nodes.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
