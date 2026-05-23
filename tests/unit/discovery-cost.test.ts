import { describe, expect, it } from 'vitest';
import { depthOf, scaleForDepth, scaledCostFor } from '@/rules';

describe('Discovery cost scaling (M_FEATURE.2)', () => {
  it('scaleForDepth: 0 → 1.0, 1 → 2.0, 3 → 3.0', () => {
    expect(scaleForDepth(0)).toBe(1);
    expect(scaleForDepth(1)).toBe(2); // 1 + log2(2) = 2
    expect(scaleForDepth(3)).toBe(3); // 1 + log2(4) = 3
    expect(scaleForDepth(7)).toBe(4); // 1 + log2(8) = 4
  });

  it('scaleForDepth clamps negative depth to 0 → 1.0', () => {
    expect(scaleForDepth(-1)).toBe(1);
    expect(scaleForDepth(-99)).toBe(1);
  });

  it('depthOf root discoveries (no prereqs) is 0', () => {
    // Both seeded discoveries are roots in the v0.4 registry.
    expect(depthOf('forgedBlades')).toBe(0);
    expect(depthOf('steelPlows')).toBe(0);
  });

  it('scaledCostFor a root discovery equals base cost', () => {
    const cost = scaledCostFor('forgedBlades');
    // forgedBlades base: stone: 100, gold: 150
    expect(cost.stone).toBe(100);
    expect(cost.gold).toBe(150);
  });

  it('scaledCostFor an unknown id returns empty cost', () => {
    expect(scaledCostFor('does-not-exist')).toEqual({});
  });
});
