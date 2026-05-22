import { describe, expect, it } from 'vitest';
import { areAdjacent, hexNeighbors } from '@/core/hex';

describe('hex adjacency', () => {
  it('hexNeighbors returns the six neighbor keys', () => {
    const ns = hexNeighbors(0, 0);
    expect(ns).toHaveLength(6);
    expect(ns).toContain('1,0');
    expect(ns).toContain('-1,1');
  });

  it('areAdjacent is true for neighboring tiles', () => {
    expect(areAdjacent('0,0', '1,0')).toBe(true);
    expect(areAdjacent('0,0', '0,-1')).toBe(true);
  });

  it('areAdjacent is false for the same tile or distant tiles', () => {
    expect(areAdjacent('0,0', '0,0')).toBe(false);
    expect(areAdjacent('0,0', '3,0')).toBe(false);
  });
});
