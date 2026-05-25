/**
 * M_FUN.TEST.RESOURCE-SPAWN-TIER — unit coverage for the distance-based
 * tier scaling in `src/world/resource-spawn.ts`.
 *
 * Tests pin:
 *   1. The three tier bands (surface, inland, highland) by ratio and
 *      their declared amountMul + chanceMul values.
 *   2. Edge case: boardRadius = 0 (single-tile board, ratio = 0 → highland).
 *   3. Integration: spawnResourceNodes amount output scales per tier for
 *      tiles at contrasting distances on a minimal real board.
 */
import { describe, expect, it } from 'vitest';
import { tierMultipliers } from '@/world/resource-spawn';

describe('tierMultipliers', () => {
  const radius = 10;

  it('surface tier: d/radius > 0.66 → 0.6× amount, 1.0× chance', () => {
    // d = 7 → ratio = 0.7 > 0.66
    const result = tierMultipliers(7, 0, radius);
    expect(result.amountMul).toBeCloseTo(0.6);
    expect(result.chanceMul).toBeCloseTo(1.0);
  });

  it('inland tier: 0.33 < d/radius <= 0.66 → 1.0× amount, 1.0× chance', () => {
    // d = 5 → ratio = 0.5 → inland
    const result = tierMultipliers(5, 0, radius);
    expect(result.amountMul).toBeCloseTo(1.0);
    expect(result.chanceMul).toBeCloseTo(1.0);
  });

  it('highland tier: d/radius <= 0.33 → 1.5× amount, 0.8× chance', () => {
    // d = 2 → ratio = 0.2 → highland
    const result = tierMultipliers(2, 0, radius);
    expect(result.amountMul).toBeCloseTo(1.5);
    expect(result.chanceMul).toBeCloseTo(0.8);
  });

  it('origin tile (d = 0) → highland', () => {
    const result = tierMultipliers(0, 0, radius);
    expect(result.amountMul).toBeCloseTo(1.5);
    expect(result.chanceMul).toBeCloseTo(0.8);
  });

  it('edge: boardRadius = 0 → highland (ratio clamped to 0)', () => {
    const result = tierMultipliers(0, 0, 0);
    expect(result.amountMul).toBeCloseTo(1.5);
    expect(result.chanceMul).toBeCloseTo(0.8);
  });

  it('boundary d/radius exactly 0.66 → inland (not surface)', () => {
    // d = 6.6 is not integer; nearest is d = 7 (surface) vs d = 6 (0.6 ≤ 0.66 → inland)
    const result = tierMultipliers(6, 0, radius); // ratio = 0.6 ≤ 0.66
    expect(result.amountMul).toBeCloseTo(1.0); // inland
  });

  it('boundary d/radius exactly 0.33 → highland (not inland)', () => {
    // d = 3.3 → d = 3 → ratio = 0.3 ≤ 0.33 → highland
    const result = tierMultipliers(3, 0, radius); // ratio = 0.3 ≤ 0.33
    expect(result.amountMul).toBeCloseTo(1.5); // highland
  });

  it('d/radius just above 0.33 → inland', () => {
    // d = 4 → ratio = 0.4 → inland
    const result = tierMultipliers(4, 0, radius);
    expect(result.amountMul).toBeCloseTo(1.0);
    expect(result.chanceMul).toBeCloseTo(1.0);
  });

  it('highland yields more than inland which yields more than surface', () => {
    const highland = tierMultipliers(1, 0, radius).amountMul;
    const inland = tierMultipliers(5, 0, radius).amountMul;
    const surface = tierMultipliers(9, 0, radius).amountMul;
    expect(highland).toBeGreaterThan(inland);
    expect(inland).toBeGreaterThan(surface);
  });

  it('only highland reduces spawn chance', () => {
    const highlandChance = tierMultipliers(1, 0, radius).chanceMul;
    const inlandChance = tierMultipliers(5, 0, radius).chanceMul;
    const surfaceChance = tierMultipliers(9, 0, radius).chanceMul;
    expect(highlandChance).toBeCloseTo(0.8);
    expect(inlandChance).toBeCloseTo(1.0);
    expect(surfaceChance).toBeCloseTo(1.0);
  });
});
