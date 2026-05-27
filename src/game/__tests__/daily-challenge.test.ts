/**
 * M_V11.DAILY-CHALLENGE (#77i) — seed-of-the-day determinism +
 * leaderboard substrate pins.
 */
import { describe, expect, it } from 'vitest';
import {
  dailyChallengeSeedFor,
  hashStringFnv1a,
  todayUTC,
  todaysDailyChallengeSeed,
} from '@/game/daily-challenge';

describe('M_V11.DAILY-CHALLENGE — seed-of-the-day determinism', () => {
  it('todayUTC formats as YYYY-MM-DD with leading zeros', () => {
    expect(todayUTC(new Date(Date.UTC(2026, 4, 27)))).toBe('2026-05-27');
    expect(todayUTC(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01');
    expect(todayUTC(new Date(Date.UTC(2026, 11, 31)))).toBe('2026-12-31');
  });

  it('hashStringFnv1a is stable across calls', () => {
    const a = hashStringFnv1a('2026-05-27');
    const b = hashStringFnv1a('2026-05-27');
    expect(a).toBe(b);
    // Different inputs → different outputs (extremely high probability).
    const c = hashStringFnv1a('2026-05-28');
    expect(c).not.toBe(a);
  });

  it('dailyChallengeSeedFor returns the same phrase for the same date', () => {
    expect(dailyChallengeSeedFor('2026-05-27')).toBe(dailyChallengeSeedFor('2026-05-27'));
  });

  it('dailyChallengeSeedFor returns a 3-token adjective-adjective-noun phrase', () => {
    const seed = dailyChallengeSeedFor('2026-05-27');
    const parts = seed.split('-');
    expect(parts.length).toBe(3);
    for (const p of parts) {
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it('todaysDailyChallengeSeed returns a non-empty seed phrase', () => {
    const seed = todaysDailyChallengeSeed(new Date(Date.UTC(2026, 4, 27)));
    expect(seed).toBe(dailyChallengeSeedFor('2026-05-27'));
  });
});
