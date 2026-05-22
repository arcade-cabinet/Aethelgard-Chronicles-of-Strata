import { describe, expect, it } from 'vitest';
import { advanceEventSeed, createEventPrng, createMapPrng, cyrb128 } from '@/core/rng';

describe('two-PRNG model', () => {
  it('cyrb128 is deterministic for a given string', () => {
    const a = cyrb128('ancient-silver-forest');
    const b = cyrb128('ancient-silver-forest');
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
  });

  it('cyrb128 produces different hashes for different strings', () => {
    expect(cyrb128('ancient-silver-forest')).not.toEqual(cyrb128('grizzled-crimson-keep'));
  });

  it('same phrase → same map stream', () => {
    const a = createMapPrng('ancient-silver-forest');
    const b = createMapPrng('ancient-silver-forest');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('map stream values are in [0, 1)', () => {
    const rng = createMapPrng('test-seed-phrase');
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('createEventPrng is deterministic for the same seed string', () => {
    const a = createEventPrng('event-seed-42');
    const b = createEventPrng('event-seed-42');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('map and event streams are independent — different values for same input phrase', () => {
    const mapRng = createMapPrng('ancient-silver-forest');
    const eventRng = createEventPrng('ancient-silver-forest');
    const mapSeq = [mapRng(), mapRng(), mapRng()];
    const eventSeq = [eventRng(), eventRng(), eventRng()];
    // The two streams use different cyrb128 projections so they differ
    expect(mapSeq).not.toEqual(eventSeq);
  });

  it('advanceEventSeed produces a non-empty deterministic string', () => {
    const rng = createEventPrng('base-seed');
    const s1 = advanceEventSeed(rng);
    expect(typeof s1).toBe('string');
    expect(s1.length).toBeGreaterThan(0);
  });

  it('advanceEventSeed is deterministic — same rng state → same output', () => {
    const a = createEventPrng('base-seed');
    const b = createEventPrng('base-seed');
    expect(advanceEventSeed(a)).toBe(advanceEventSeed(b));
  });

  it('advanceEventSeed produces a different string than the original seed', () => {
    const seed = 'original-event-seed';
    const rng = createEventPrng(seed);
    const advanced = advanceEventSeed(rng);
    expect(advanced).not.toBe(seed);
  });
});
