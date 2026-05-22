import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { rampKey } from '@/core/ramps';

describe('ramp placement', () => {
  it('rampKey is order-independent', () => {
    expect(rampKey('1,0', '2,0')).toBe(rampKey('2,0', '1,0'));
  });

  it('every ramp connects two tiles differing by exactly one level', () => {
    const board = generateBoard('ancient-silver-forest');
    for (const ramp of board.ramps.values()) {
      const a = board.tiles.get(ramp.lowKey);
      const b = board.tiles.get(ramp.highKey);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(Math.abs((a?.level ?? 0) - (b?.level ?? 0))).toBe(1);
    }
  });

  it('no ramp touches an ocean or lake tile', () => {
    const board = generateBoard('ancient-silver-forest');
    for (const ramp of board.ramps.values()) {
      const a = board.tiles.get(ramp.lowKey);
      const b = board.tiles.get(ramp.highKey);
      expect(a?.walkable).toBe(true);
      expect(b?.walkable).toBe(true);
    }
  });

  it('ramp set is deterministic for a given seed', () => {
    const a = generateBoard('ancient-silver-forest');
    const b = generateBoard('ancient-silver-forest');
    expect([...a.ramps.keys()].sort()).toEqual([...b.ramps.keys()].sort());
  });
});
