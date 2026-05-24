/**
 * Auto-save timer.
 *
 * A lightweight struct that accumulates game-time delta and fires a save
 * callback once per `AUTO_SAVE_INTERVAL` game-seconds.
 *
 * Source: docs/specs/95-persistence.md §Auto-Save
 */

/** Auto-save interval in game-seconds (5 minutes). */
export const AUTO_SAVE_INTERVAL = 300;

/** Auto-save timer state. */
export interface AutoSave {
  /** Accumulated game-time since the last save (or session start). */
  elapsed: number;
  /** The callback invoked when the interval elapses; returns a Promise. */
  onSave: () => Promise<void> | void;
  /**
   * M_AUDIT2.SEC2.27 — concurrency guard. If the previous save promise
   * hasn't resolved (slow IndexedDB on low-end devices), skip the next
   * tick so writes don't interleave.
   */
  saving: boolean;
  /**
   * Number of ticks skipped because the previous save was still in
   * flight. Diagnostic surface for storage-throughput regressions —
   * a healthy game ticks this at 0; growing values point at a slow
   * persistence layer.
   */
  skipped: number;
}

/**
 * Create a new auto-save timer. `onSave` is called each time
 * `AUTO_SAVE_INTERVAL` game-seconds have elapsed.
 */
export function createAutoSave(onSave: () => Promise<void> | void): AutoSave {
  return { elapsed: 0, onSave, saving: false, skipped: 0 };
}

/**
 * Advance the auto-save timer by `delta` game-seconds. Calls `onSave`
 * and resets `elapsed` whenever the interval is reached, UNLESS the
 * previous save promise is still in flight (concurrency guard) —
 * in which case the tick is counted as skipped.
 */
export function tickAutoSave(auto: AutoSave, delta: number): void {
  auto.elapsed += delta;
  if (auto.elapsed < AUTO_SAVE_INTERVAL) return;
  auto.elapsed -= AUTO_SAVE_INTERVAL;
  if (auto.saving) {
    auto.skipped += 1;
    return;
  }
  auto.saving = true;
  const result = auto.onSave();
  // M_PROCESS.REVIEW must-fix #3 — onSave is sync in the legacy
  // contract, async in the new one. Promise.resolve normalises
  // both. The .catch() before .finally() swallows transient SQLite
  // write failures (e.g. EncryptedSharedPrefs corruption on
  // Android) so they don't bubble as unhandledRejection in the
  // game loop — every AUTO_SAVE_INTERVAL otherwise. The catch
  // logs the error once at warn level (production-strippable via
  // future __DEV__ guard) so a developer still sees it.
  Promise.resolve(result)
    .catch((err) => {
      console.warn('[auto-save] save failed:', err);
    })
    .finally(() => {
      auto.saving = false;
    });
}
