/**
 * M_V9.AUDIO.N-PLAYER-CRESCENDO — crescendo detection sweeps all faction ids.
 *
 * 2 contracts:
 *   1. isCrescendoImminentFromTimers returns true when any faction timer is
 *      between 0 and 3 seconds — sweeps all faction ids including N-player slots.
 *   2. isCrescendoImminentFromTimers returns false when no faction timer is
 *      below the 3-second threshold.
 */
import { describe, expect, it } from 'vitest';
import { isCrescendoImminentFromTimers } from '@/audio/useAudio';

describe('M_V9.AUDIO.N-PLAYER-CRESCENDO', () => {
  it('returns true when any faction has a timer between 0 and 3 seconds', () => {
    // 4-player scenario: player and enemy have Infinity, ai-3 is at 2.5s.
    const timers = {
      player: Infinity,
      enemy: Infinity,
      'player-3': 2.5,
      'player-4': Infinity,
    };
    expect(isCrescendoImminentFromTimers(timers)).toBe(true);
  });

  it('returns false when no faction timer is below the 3-second threshold', () => {
    const timers = {
      player: Infinity,
      enemy: 60,
      'player-3': 45,
      'player-4': Infinity,
    };
    expect(isCrescendoImminentFromTimers(timers)).toBe(false);
  });

  it('returns false for an empty timer map', () => {
    expect(isCrescendoImminentFromTimers({})).toBe(false);
  });

  it('returns false when timer is exactly 0 (already triggered, not imminent)', () => {
    // The range is 0 < wt < 3 — zero itself is NOT imminent (win already fired).
    const timers = { player: 0, enemy: Infinity };
    expect(isCrescendoImminentFromTimers(timers)).toBe(false);
  });
});
