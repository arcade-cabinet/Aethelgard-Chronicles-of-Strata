/**
 * M_EXPANSION.F.77 — achievements registry + persistence helper.
 *
 * Achievements are persistent flags. The set is read from
 * Preferences on demand, modified in memory, and written back on
 * unlock. Comma-separated string format keeps the wire shape
 * portable (Capacitor Preferences is string-typed).
 *
 * Adding an achievement: one row in ACHIEVEMENTS + one call site in
 * the achievement-emit point.
 */
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

import { z } from 'zod';
// M_FUN.ECON.JSON-ACHIEVEMENTS — registry sourced from
// `src/config/achievements.json` via Zod. Adding a new
// achievement = one JSON entry; the persistence layer + HUD
// toast picks it up automatically.
import achievementsJson from '@/config/achievements.json';

const AchievementDefSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});
const AchievementsFileSchema = z.object({ achievements: z.array(AchievementDefSchema).min(1) });

function stripAchievementComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripAchievementComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripAchievementComments(v);
    }
    return out;
  }
  return input;
}

const _validatedAchievements = AchievementsFileSchema.parse(
  stripAchievementComments(achievementsJson),
);
export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = _validatedAchievements.achievements;

/** Read the persisted unlocked-achievement id set. */
export async function readUnlockedAchievements(persistence: Persistence): Promise<Set<string>> {
  const raw = await safePersistenceRead(
    persistence,
    PREF_KEYS.achievements,
    (s) => s ?? '',
    '',
    'achievements',
  );
  if (!raw) return new Set();
  return new Set(raw.split(',').filter(Boolean));
}

/**
 * Unlock an achievement (no-op if already unlocked). Persists the
 * updated set. Returns true when the unlock actually fired (i.e. was
 * not already in the set) so the caller can play a chime / show toast.
 */
export async function unlockAchievement(persistence: Persistence, id: string): Promise<boolean> {
  const set = await readUnlockedAchievements(persistence);
  if (set.has(id)) return false;
  set.add(id);
  await persistence.setSetting(PREF_KEYS.achievements, [...set].join(','));
  return true;
}
