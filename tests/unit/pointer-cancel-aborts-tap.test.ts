import { describe, expect, it } from 'vitest';
import { isTap, TAP_THRESHOLD_PX } from '@/world/terrain';

/**
 * M_POLISH2.MOBILE.9 — pointercancel-aborts-tap.
 *
 * The actual pointercancel wiring lives inside the r3f-mesh
 * TilePick component (useEffect installs a window-level
 * pointercancel listener that wipes longPressRef). That listener
 * is exercised by chromium under tests/browser; here we pin the
 * adjacent helper contract that determines whether a touch was
 * a tap or a pan — the same helper the post-cancel branch reads.
 *
 * If a tap was 'cancelled' by the OS (pinch-zoom started), the
 * follow-up pointerup arrives at coordinates farther from
 * pointerdown than the cancel-emitting first finger — even when
 * the released-finger landed on the same tile, the gesture in
 * AGGREGATE is no longer a single-finger tap. The 6px threshold
 * is the natural disambiguation.
 */
describe('M_POLISH2.MOBILE.9 — pointercancel + tap threshold', () => {
  it('a single-finger tap on the same pixel is still a tap', () => {
    expect(isTap(100, 100, 100, 100)).toBe(true);
  });

  it('the second finger of a pinch lands beyond the tap threshold', () => {
    // Two-finger pinch starts at (100,100) and the OS cancels the
    // first pointer when the second pointer enters; the released
    // second finger lands ~40px away.
    expect(isTap(100, 100, 140, 100)).toBe(false);
  });

  it('threshold constant is the documented 6px', () => {
    expect(TAP_THRESHOLD_PX).toBe(6);
  });
});
