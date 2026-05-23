import { describe, expect, it } from 'vitest';
import { axialToWorld, getHexCorner, getHexKey, hexDistance, round } from '@/core/hex';

describe('hex math', () => {
  it('axialToWorld places the origin tile at world origin', () => {
    expect(axialToWorld(0, 0)).toEqual({ x: 0, z: 0 });
  });

  it('axialToWorld places (1,0) at x = sqrt(3)', () => {
    const w = axialToWorld(1, 0);
    expect(w.x).toBeCloseTo(Math.sqrt(3), 3);
    expect(w.z).toBeCloseTo(0, 3);
  });

  it('axialToWorld places (0,1) at z = 1.5', () => {
    const w = axialToWorld(0, 1);
    expect(w.z).toBeCloseTo(1.5, 3);
  });

  it('getHexCorner 0 is at angle -30 degrees from the centre', () => {
    const c = getHexCorner(0, 0, 0);
    expect(c.x).toBeCloseTo(Math.cos((-30 * Math.PI) / 180), 3);
    expect(c.z).toBeCloseTo(Math.sin((-30 * Math.PI) / 180), 3);
  });

  it('the six corners of (0,0) form a closed hexagon', () => {
    const corners = Array.from({ length: 6 }, (_, i) => getHexCorner(0, 0, i));
    // every corner is HEX_RADIUS (1) from the centre
    for (const c of corners) {
      expect(Math.hypot(c.x, c.z)).toBeCloseTo(1, 3);
    }
    // corner 6 wraps to corner 0
    expect(getHexCorner(0, 0, 6 % 6)).toEqual(corners[0]);
  });

  it('round clamps to 3 decimal places', () => {
    expect(round(1.23456)).toBe(1.235);
  });

  it('getHexKey formats axial coords as a string key', () => {
    expect(getHexKey(2, -3)).toBe('2,-3');
  });

  it('hexDistance returns cube distance between two tiles', () => {
    expect(hexDistance(0, 0, 3, 0)).toBe(3);
    expect(hexDistance(0, 0, 0, 0)).toBe(0);
    expect(hexDistance(0, 0, -2, 2)).toBe(2);
  });
});
