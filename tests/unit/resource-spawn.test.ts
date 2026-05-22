import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { createMapPrng } from '@/core/rng';
import { spawnResourceNodes } from '@/world/resource-spawn';

describe('resource node spawning', () => {
  it('is deterministic for a given seed', () => {
    const a = spawnResourceNodes(
      generateBoard('ancient-silver-forest'),
      createMapPrng('ancient-silver-forest'),
    );
    const b = spawnResourceNodes(
      generateBoard('ancient-silver-forest'),
      createMapPrng('ancient-silver-forest'),
    );
    expect(a.map((n) => n.key)).toEqual(b.map((n) => n.key));
  });

  it('places wood nodes only on forest tiles', () => {
    const board = generateBoard('ancient-silver-forest');
    const nodes = spawnResourceNodes(board, createMapPrng('ancient-silver-forest'));
    for (const node of nodes) {
      if (node.resourceType === 'wood') {
        expect(board.tiles.get(node.key)?.type).toBe('FOREST');
      }
    }
  });

  it('produces at least one node of every resource type', () => {
    const board = generateBoard('ancient-silver-forest');
    const nodes = spawnResourceNodes(board, createMapPrng('ancient-silver-forest'));
    const types = new Set(nodes.map((n) => n.resourceType));
    expect(types.has('wood')).toBe(true);
    expect(types.has('stone')).toBe(true);
    expect(types.has('gold')).toBe(true);
  });

  it('never places two nodes on the same tile', () => {
    const board = generateBoard('ancient-silver-forest');
    const nodes = spawnResourceNodes(board, createMapPrng('ancient-silver-forest'));
    const keys = nodes.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
