/**
 * M_EXPANSION.U.119 — unit tests for the touch-drag state helper.
 *
 * The helper is pure state (no DOM), so these run in the Node env.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  _resetForTest,
  computePanDelta,
  isDragging,
  startDrag,
  stopDrag,
} from '@/world/touch-drag';

beforeEach(() => {
  _resetForTest();
});

describe('touch-drag state machine', () => {
  it('starts in idle — isDragging() is false before any interaction', () => {
    expect(isDragging()).toBe(false);
  });

  it('isDragging() returns true after startDrag() and false after stopDrag()', () => {
    startDrag(100, 200);
    expect(isDragging()).toBe(true);
    stopDrag();
    expect(isDragging()).toBe(false);
  });

  it('computePanDelta returns {dx:0, dz:0} when not dragging', () => {
    const delta = computePanDelta(110, 220, 60);
    expect(delta).toEqual({ dx: 0, dz: 0 });
  });

  it('computePanDelta returns non-zero deltas proportional to pixel movement', () => {
    startDrag(100, 100);
    // Move +20px in X, +10px in Y.
    const delta = computePanDelta(120, 110, 60);
    // dx should be negative (camera pans left when dragging right)
    expect(delta.dx).toBeLessThan(0);
    // dz should be negative (camera pans forward when dragging down in screen)
    expect(delta.dz).toBeLessThan(0);
    // Magnitudes should scale with camera distance (60 * 0.005 = 0.3 scale)
    expect(Math.abs(delta.dx)).toBeCloseTo(20 * 60 * 0.005, 5);
    expect(Math.abs(delta.dz)).toBeCloseTo(10 * 60 * 0.005, 5);
  });

  it('computePanDelta accumulates position: second call uses updated baseline', () => {
    startDrag(0, 0);
    computePanDelta(10, 10, 60); // advance baseline to (10,10)
    const delta = computePanDelta(20, 10, 60); // only +10 in X, 0 in Y
    expect(Math.abs(delta.dz)).toBeCloseTo(0, 5);
    expect(Math.abs(delta.dx)).toBeCloseTo(10 * 60 * 0.005, 5);
  });

  it('larger camera distance produces larger world-space delta for same pixel move', () => {
    startDrag(0, 0);
    const nearDelta = computePanDelta(10, 0, 20);

    _resetForTest();
    startDrag(0, 0);
    const farDelta = computePanDelta(10, 0, 80);

    expect(Math.abs(farDelta.dx)).toBeGreaterThan(Math.abs(nearDelta.dx));
  });
});
