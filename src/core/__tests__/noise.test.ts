import { describe, expect, it } from 'vitest';
import { createNoise2D } from '../noise';
import { createDualPrng } from '../rng';

describe('value noise', () => {
  it('returns values in [0, 1]', () => {
    const noise = createNoise2D(createDualPrng('ancient-silver-forest').map);
    for (let i = 0; i < 50; i++) {
      const v = noise(i * 0.13, i * 0.27);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createNoise2D(createDualPrng('ancient-silver-forest').map);
    const b = createNoise2D(createDualPrng('ancient-silver-forest').map);
    expect(a(1.5, 2.5)).toBe(b(1.5, 2.5));
  });

  it('is continuous — nearby samples are close in value', () => {
    const noise = createNoise2D(createDualPrng('test-seed').map);
    const a = noise(5.0, 5.0);
    const b = noise(5.01, 5.0);
    expect(Math.abs(a - b)).toBeLessThan(0.1);
  });

  it('different seeds produce different fields', () => {
    const a = createNoise2D(createDualPrng('seed-one-alpha').map);
    const b = createNoise2D(createDualPrng('seed-two-beta').map);
    expect(a(3.3, 4.4)).not.toBe(b(3.3, 4.4));
  });
});
