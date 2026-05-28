/**
 * M_V11.DAILY-CHALLENGE (#77i) — seed-of-the-day + leaderboard.
 *
 * Every player gets the same map/event seed for today's UTC date.
 * The score (sim-time-to-victory or final-supply if loss) persists
 * to an install-wide sqlite leaderboard for local-only ranking.
 *
 * Today's seed is a stable hash of the UTC date string `YYYY-MM-DD`.
 * The hash is a small deterministic int so the resulting seedPhrase
 * sorts cleanly + reads as an adjective-adjective-noun token.
 */

const SEED_ADJECTIVES = [
  'iron',
  'gold',
  'frost',
  'amber',
  'azure',
  'crimson',
  'silver',
  'shadow',
  'ember',
  'opal',
  'jade',
  'onyx',
  'pearl',
  'ruby',
  'sage',
  'storm',
] as const;

const SEED_NOUNS = [
  'realm',
  'keep',
  'dawn',
  'tide',
  'crown',
  'spire',
  'gate',
  'star',
  'forge',
  'reach',
  'hall',
  'pass',
  'vault',
  'wood',
  'glen',
  'rune',
] as const;

/** Today's UTC date as YYYY-MM-DD. Pure function — pass a Date
 *  for tests; defaults to now. */
export function todayUTC(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Small deterministic integer hash of a string (FNV-1a 32-bit).
 *  Stable across platforms; output range [0, 2^32). */
export function hashStringFnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Pick the seed phrase for `dateUTC` (`YYYY-MM-DD`).
 *  Stable: same date → same phrase, every player, every install. */
export function dailyChallengeSeedFor(dateUTC: string): string {
  const h = hashStringFnv1a(dateUTC);
  const a1 = SEED_ADJECTIVES[h % SEED_ADJECTIVES.length] ?? 'iron';
  const a2 = SEED_ADJECTIVES[(h >>> 8) % SEED_ADJECTIVES.length] ?? 'gold';
  const n = SEED_NOUNS[(h >>> 16) % SEED_NOUNS.length] ?? 'realm';
  return `${a1}-${a2}-${n}`;
}

/** Today's seed phrase — convenience. */
export function todaysDailyChallengeSeed(now: Date = new Date()): string {
  return dailyChallengeSeedFor(todayUTC(now));
}

/** A single leaderboard row. */
export interface DailyChallengeScore {
  /** UTC date the run finished, YYYY-MM-DD. */
  dateUTC: string;
  /** Seed phrase the run played. */
  seedPhrase: string;
  /** Match outcome. */
  outcome: 'win' | 'loss' | 'draw';
  /** Sim-time-to-victory (for wins) or sim-time-survived (for losses). */
  simSeconds: number;
  /** Final score: lower is better for a win (faster), higher is better for a loss (lasted longer). */
  score: number;
  /** ISO timestamp the run finished. */
  endedAtIso: string;
}
