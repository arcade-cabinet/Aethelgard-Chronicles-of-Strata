/**
 * M_EXPANSION.T.139 — i18n facade.
 *
 * Today's implementation is a NO-OP that returns the English source
 * string verbatim. The point isn't to ship localizations today; the
 * point is to lock the contract: EVERY user-facing string in the
 * render layer must flow through `t()` so a future localization
 * pass can swap the bundle without re-touching every component.
 *
 * The convention:
 *   import { t } from '@/hud/i18n';
 *   ...
 *   <button>{t('newgame.begin', 'Begin')}</button>
 *
 * Where 'newgame.begin' is the stable id (translations key) and
 * 'Begin' is the English source (the fallback if the bundle is
 * missing a row, AND the dev-time visible text).
 *
 * Phase 2 (separate item): replace the body with a real bundle
 * lookup keyed on locale; load the bundle JSON in main.tsx.
 */
export function t(_id: string, source: string): string {
  // Today: passthrough. The id is recorded as a no-op for the
  // future bundle lookup. Dev-time the source string is what
  // renders, exactly as before the migration.
  return source;
}

/**
 * Plural variant — picks one of two source strings based on the
 * count. The id convention: 'noun.plural' (always provide both
 * singular + plural English source strings).
 */
export function tn(_id: string, count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
