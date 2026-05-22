import { describe, expect, it } from 'vitest';
import { createDualPrng, cyrb128 } from '@/core/rng';

describe('dual-stage PRNG', () => {
  it('cyrb128 is deterministic for a given string', () => {
    const a = cyrb128('ancient-silver-forest');
    const b = cyrb128('ancient-silver-forest');
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
  });

  it('cyrb128 produces different hashes for different strings', () => {
    expect(cyrb128('ancient-silver-forest')).not.toEqual(cyrb128('grizzled-crimson-keep'));
  });

  it('map and event streams differ for the same seed phrase', () => {
    const { map, event } = createDualPrng('ancient-silver-forest');
    const mapSeq = [map(), map(), map()];
    const eventSeq = [event(), event(), event()];
    expect(mapSeq).not.toEqual(eventSeq);
  });

  it('replaying the same seed produces identical map sequences', () => {
    const a = createDualPrng('ancient-silver-forest');
    const b = createDualPrng('ancient-silver-forest');
    expect([a.map(), a.map(), a.map()]).toEqual([b.map(), b.map(), b.map()]);
  });

  it('replaying the same seed produces identical event sequences', () => {
    const a = createDualPrng('ancient-silver-forest');
    const b = createDualPrng('ancient-silver-forest');
    expect([a.event(), a.event()]).toEqual([b.event(), b.event()]);
  });

  it('every PRNG value is in [0, 1)', () => {
    const { map } = createDualPrng('test-seed-phrase');
    for (let i = 0; i < 100; i++) {
      const v = map();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
