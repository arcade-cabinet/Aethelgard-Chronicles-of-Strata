import { describe, expect, it } from 'vitest';
import { isTap, TAP_THRESHOLD_PX } from '@/world/touch-tap-threshold';

/**
 * M_POLISH2.MOBILE.6 — tap-vs-pan disambiguation contract. Pins:
 *   - zero movement → tap
 *   - movement at threshold boundary → tap (≤ is inclusive)
 *   - movement just above threshold → NOT a tap
 *   - diagonal movement uses euclidean distance, not Chebyshev
 *   - custom threshold parameter is honored
 */
describe('M_POLISH2.MOBILE.6 — touch-tap threshold', () => {
  it('zero movement is a tap', () => {
    expect(isTap(100, 100, 100, 100)).toBe(true);
  });

  it('movement at the threshold boundary is a tap (inclusive)', () => {
    expect(isTap(0, 0, TAP_THRESHOLD_PX, 0)).toBe(true);
    expect(isTap(0, 0, 0, TAP_THRESHOLD_PX)).toBe(true);
  });

  it('movement just above the threshold is NOT a tap', () => {
    expect(isTap(0, 0, TAP_THRESHOLD_PX + 1, 0)).toBe(false);
  });

  it('uses euclidean (not chebyshev) distance', () => {
    // 5,5 — chebyshev = 5 (under threshold) but euclidean = ~7.07
    // (above threshold). The test pins the euclidean interpretation.
    expect(isTap(0, 0, 5, 5)).toBe(false);
    // 4,4 — euclidean ~5.66 (under threshold)
    expect(isTap(0, 0, 4, 4)).toBe(true);
  });

  it('custom threshold parameter is honored', () => {
    // With a 20px threshold the (10, 10) movement IS a tap.
    expect(isTap(0, 0, 10, 10, 20)).toBe(true);
    // With a 2px threshold the (3, 0) movement is NOT.
    expect(isTap(0, 0, 3, 0, 2)).toBe(false);
  });
});
