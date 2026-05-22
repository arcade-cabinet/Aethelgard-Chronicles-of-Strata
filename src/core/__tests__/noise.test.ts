import { describe, expect, it } from 'vitest';
import { createNoise2D } from '../noise';
import { createMapPrng } from '../rng';

describe('value noise', () => {
  it('returns values in [0, 1]', () => {
    const noise = createNoise2D(createMapPrng('ancient-silver-forest'));
    for (let i = 0; i < 50; i++) {
      const v = noise(i * 0.13, i * 0.27);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createNoise2D(createMapPrng('ancient-silver-forest'));
    const b = createNoise2D(createMapPrng('ancient-silver-forest'));
    expect(a(1.5, 2.5)).toBe(b(1.5, 2.5));
  });

  it('is continuous — nearby samples are close in value', () => {
    const noise = createNoise2D(createMapPrng('test-seed'));
    const a = noise(5.0, 5.0);
    const b = noise(5.01, 5.0);
    expect(Math.abs(a - b)).toBeLessThan(0.1);
  });

  it('different seeds produce different fields', () => {
    const a = createNoise2D(createMapPrng('seed-one-alpha'));
    const b = createNoise2D(createMapPrng('seed-two-beta'));
    expect(a(3.3, 4.4)).not.toBe(b(3.3, 4.4));
  });
});
