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
import { PREF_KEYS, type Persistence, safePersistenceRead } from '@/persistence/persistence';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  {
    id: 'first-victory',
    title: 'First Victory',
    description: 'Win your first game.',
  },
  {
    id: 'wonder-win',
    title: 'Builder of Wonders',
    description: 'Win by completing the Wonder countdown.',
  },
  {
    id: 'turtle-victory',
    title: 'Patience',
    description: 'Win without building a single Watchtower.',
  },
  {
    id: 'first-discovery',
    title: 'Curious Mind',
    description: 'Purchase your first Discovery.',
  },
  {
    id: 'first-kill',
    title: 'Blooded',
    description: 'Defeat your first enemy unit.',
  },
] as const;

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
