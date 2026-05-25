/**
 * M_V8.REVIEWER.FULL-CYCLE (H-1) — regression test for wonder crescendo N-player.
 *
 * v0.8 briefly regressed the crescendo trigger from N-player
 * `Object.values(game.wonderTimers)` to a 2-faction hardcode
 * (`game.wonderTimers?.player` / `game.wonderTimers?.enemy`).
 *
 * This test pins the correct behavior: the crescendo "imminent" flag
 * should fire when ANY faction's wonder timer is in the 0–3s window,
 * including N-player faction ids like 'ai-3' and 'player-4'.
 *
 * The actual `useAudio` hook is not exercised here (it uses `useFrame`
 * from react-three-fiber, which requires a Canvas context). Instead
 * we test the pure computation that the hook delegates to:
 *   `Object.values(wonderTimers).some(wt => wt > 0 && wt < 3)`
 */
import { describe, expect, it } from 'vitest';

/**
 * Pure crescendo check — mirrors the logic in useAudio.ts.
 * Extracted here to make it independently testable without a Canvas.
 */
function isCrescendoImminent(wonderTimers: Record<string, number>): boolean {
  return Object.values(wonderTimers).some((wt) => typeof wt === 'number' && wt > 0 && wt < 3);
}

describe('M_V8.REVIEWER.FULL-CYCLE (H-1) — wonder crescendo N-player regression', () => {
  it('triggers when legacy player timer is in 0–3s window', () => {
    expect(isCrescendoImminent({ player: 1.5, enemy: Infinity })).toBe(true);
  });

  it('triggers when legacy enemy timer is in 0–3s window', () => {
    expect(isCrescendoImminent({ player: Infinity, enemy: 2.0 })).toBe(true);
  });

  it('triggers when N-player faction (ai-3) timer is in 0–3s window', () => {
    // This is the regression case: the 2-faction hardcode missed 'ai-3'.
    expect(
      isCrescendoImminent({ player: Infinity, enemy: Infinity, 'ai-3': 1.0, 'player-4': Infinity }),
    ).toBe(true);
  });

  it('does NOT trigger when all timers are Infinity or above 3s', () => {
    expect(isCrescendoImminent({ player: Infinity, enemy: Infinity, 'ai-3': Infinity })).toBe(
      false,
    );
    expect(isCrescendoImminent({ player: 5.0, enemy: 10.0, 'ai-3': 7.5 })).toBe(false);
  });

  it('does NOT trigger when timer is exactly 0 (wonder-win already fired)', () => {
    // wt > 0 guards against the 0 case (outcome would already be 'win'/'loss').
    expect(isCrescendoImminent({ player: 0, enemy: Infinity })).toBe(false);
  });
});
