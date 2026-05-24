import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _resetColorblindForTests,
  isColorblindMode,
  resolveFactionTint,
  setColorblindMode,
  subscribeColorblind,
} from '@/rules/colorblind';

/**
 * M_EXPANSION.U.113 — colourblind mode toggle. Pins:
 *   - default-off + idempotent setter
 *   - default palette is the red/green pair
 *   - on → orange/cyan dichromacy-safe pair
 *   - custom playerColor wins when colourblind is OFF
 *   - colourblind palette OVERRIDES the custom playerColor when ON
 *     (accessibility outranks personal flair)
 *   - subscribers fire on a transition, not on a no-op write
 */
describe('M_EXPANSION.U.113 — colourblind mode', () => {
  afterEach(() => {
    _resetColorblindForTests();
  });

  it('defaults to off', () => {
    expect(isColorblindMode()).toBe(false);
  });

  it('default palette: player → green, enemy → red', () => {
    expect(resolveFactionTint('player')).toBe('#22c55e');
    expect(resolveFactionTint('enemy')).toBe('#ef4444');
  });

  it('colourblind palette: player → orange, enemy → cyan', () => {
    setColorblindMode(true);
    expect(resolveFactionTint('player')).toBe('#fb923c');
    expect(resolveFactionTint('enemy')).toBe('#22d3ee');
  });

  it('custom playerColor wins when colourblind is OFF', () => {
    expect(resolveFactionTint('player', '#3b82f6')).toBe('#3b82f6');
  });

  it('colourblind palette overrides custom playerColor when ON', () => {
    setColorblindMode(true);
    // even though the player picked blue, the orange dichromacy-safe
    // tint is returned — accessibility beats palette flair.
    expect(resolveFactionTint('player', '#3b82f6')).toBe('#fb923c');
  });

  it('subscribers fire on a transition only', () => {
    const cb = vi.fn();
    const unsub = subscribeColorblind(cb);
    setColorblindMode(true);
    expect(cb).toHaveBeenCalledTimes(1);
    // idempotent write — no fire
    setColorblindMode(true);
    expect(cb).toHaveBeenCalledTimes(1);
    setColorblindMode(false);
    expect(cb).toHaveBeenCalledTimes(2);
    unsub();
    setColorblindMode(true);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
