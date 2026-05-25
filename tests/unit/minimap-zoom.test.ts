/**
 * Unit tests for src/hud/minimap-zoom.ts — M_EXPANSION.U.116.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetMinimapZoomForTests,
  getMinimapZoom,
  MINIMAP_ZOOM_MAX,
  MINIMAP_ZOOM_MIN,
  setMinimapZoom,
  subscribeMinimapZoom,
} from '@/hud/minimap-zoom';

beforeEach(() => {
  _resetMinimapZoomForTests();
});

describe('getMinimapZoom — default', () => {
  it('returns 1.0 on a fresh module / after reset', () => {
    expect(getMinimapZoom()).toBe(1.0);
    expect(getMinimapZoom()).toBe(MINIMAP_ZOOM_MIN);
  });
});

describe('setMinimapZoom — clamping', () => {
  it('clamps below-minimum values to MINIMAP_ZOOM_MIN (1.0)', () => {
    setMinimapZoom(0);
    expect(getMinimapZoom()).toBe(MINIMAP_ZOOM_MIN);
  });

  it('clamps above-maximum values to MINIMAP_ZOOM_MAX (3.5)', () => {
    setMinimapZoom(99);
    expect(getMinimapZoom()).toBe(MINIMAP_ZOOM_MAX);
  });

  it('accepts in-range values exactly', () => {
    setMinimapZoom(2.0);
    expect(getMinimapZoom()).toBe(2.0);
  });
});

describe('subscribeMinimapZoom — subscriber notifications', () => {
  it('fires on genuine transition, not on same-value set', () => {
    const calls: number[] = [];
    subscribeMinimapZoom((z) => calls.push(z));

    setMinimapZoom(1.5);
    setMinimapZoom(1.5); // same value — idempotent, should NOT fire again
    expect(calls).toEqual([1.5]);
  });

  it('fires when clamped to boundary and previous value differs', () => {
    setMinimapZoom(2.0);
    const calls: number[] = [];
    subscribeMinimapZoom((z) => calls.push(z));

    setMinimapZoom(99); // clamps to 3.5, different from 2.0 → fires
    expect(calls).toEqual([MINIMAP_ZOOM_MAX]);
  });

  it('does NOT fire when already at clamp boundary and a clamped-to-same set arrives', () => {
    setMinimapZoom(99); // now at 3.5
    const calls: number[] = [];
    subscribeMinimapZoom((z) => calls.push(z));

    setMinimapZoom(4.0); // still clamps to 3.5 — no change
    setMinimapZoom(100); // same
    expect(calls).toHaveLength(0);
  });
});

describe('subscribeMinimapZoom — unsubscribe', () => {
  it('stops delivering events after the returned unsub is called', () => {
    const calls: number[] = [];
    const unsub = subscribeMinimapZoom((z) => calls.push(z));

    setMinimapZoom(2.0);
    expect(calls).toEqual([2.0]);

    unsub();
    setMinimapZoom(3.0);
    expect(calls).toEqual([2.0]); // no additional calls after unsub
  });

  it('allows multiple independent subscribers with independent cleanup', () => {
    const a: number[] = [];
    const b: number[] = [];
    const unsubA = subscribeMinimapZoom((z) => a.push(z));
    const unsubB = subscribeMinimapZoom((z) => b.push(z));

    setMinimapZoom(1.5);
    unsubA();
    setMinimapZoom(2.5);

    expect(a).toEqual([1.5]);
    expect(b).toEqual([1.5, 2.5]);

    unsubB();
    setMinimapZoom(3.0);
    expect(b).toEqual([1.5, 2.5]); // no more calls after unsubB
  });
});
