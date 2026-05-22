import { describe, expect, it } from 'vitest';
import { HEX_RADIUS, MAP_RADIUS, TILE_HEIGHT, WATER_LEVEL } from '../constants';

describe('core constants', () => {
  it('defines the hex and map geometry constants', () => {
    expect(HEX_RADIUS).toBe(1);
    expect(MAP_RADIUS).toBe(20);
    expect(TILE_HEIGHT).toBe(0.85);
    expect(WATER_LEVEL).toBe(0.5 * TILE_HEIGHT);
  });
});
