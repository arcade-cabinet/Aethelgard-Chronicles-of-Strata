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
  /** The callback invoked when the interval elapses. */
  onSave: () => void;
}

/**
 * Create a new auto-save timer. `onSave` is called each time
 * `AUTO_SAVE_INTERVAL` game-seconds have elapsed.
 */
export function createAutoSave(onSave: () => void): AutoSave {
  return { elapsed: 0, onSave };
}

/**
 * Advance the auto-save timer by `delta` game-seconds. Calls `onSave` and
 * resets `elapsed` whenever the interval is reached.
 */
export function tickAutoSave(auto: AutoSave, delta: number): void {
  auto.elapsed += delta;
  if (auto.elapsed >= AUTO_SAVE_INTERVAL) {
    auto.elapsed -= AUTO_SAVE_INTERVAL;
    auto.onSave();
  }
}
