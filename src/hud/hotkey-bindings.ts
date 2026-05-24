/**
 * M_EXPANSION.U.115 — user-remappable hotkey bindings.
 *
 * The KeyboardShortcuts component used to hard-code every binding
 * (f=Farm, h=House, …). U.115 replaces those with a lookup against
 * this module's `getBindings()`, which merges the documented defaults
 * with the user's per-action overrides loaded from Preferences.
 *
 * Action keys are stable; the bound KEY is what the user remaps. The
 * SettingsModal renders one row per action, listens for the next
 * keystroke when the user clicks the row, and writes the new key via
 * `setBinding(action, key)`. A key collision (two actions on the same
 * key) is rejected — the action's row flashes red briefly.
 *
 * NOTE: This module owns only the BINDING TABLE. Wiring the bindings
 * back into KeyboardShortcuts.tsx is the consumer's job — the
 * `BUILD_HOTKEYS` const there becomes a derivation from the bindings.
 */

import type { BuildingType } from '@/ecs/components';

/** Every rebindable action. Display strings live in HotkeyEditor.tsx. */
export type HotkeyAction =
  | 'build.Farm'
  | 'build.House'
  | 'build.Granary'
  | 'build.Barracks'
  | 'build.Watchtower'
  | 'build.Wall'
  | 'build.menu'
  | 'select.clear'
  | 'camera.zoom-in'
  | 'camera.zoom-out';

/** Documented defaults. Match the pre-U.115 hard-coded keys exactly. */
export const DEFAULT_BINDINGS: Readonly<Record<HotkeyAction, string>> = {
  'build.Farm': 'f',
  'build.House': 'h',
  'build.Granary': 'g',
  'build.Barracks': 'r',
  'build.Watchtower': 't',
  'build.Wall': 'w',
  'build.menu': 'b',
  'select.clear': 'Escape',
  'camera.zoom-in': '+',
  'camera.zoom-out': '-',
};

/**
 * Building-type → action lookup. Used by KeyboardShortcuts to derive
 * the build-key table after applying user overrides.
 */
/** Building → action lookup for the subset that has a build hotkey.
 *  Wonder + Library have no hotkey today (built via menu only). */
export const BUILDING_ACTION: Readonly<Partial<Record<BuildingType, HotkeyAction>>> = {
  Farm: 'build.Farm',
  House: 'build.House',
  Granary: 'build.Granary',
  Barracks: 'build.Barracks',
  Watchtower: 'build.Watchtower',
  Wall: 'build.Wall',
};

let bindings: Record<HotkeyAction, string> = { ...DEFAULT_BINDINGS };
const listeners = new Set<(b: Readonly<Record<HotkeyAction, string>>) => void>();

/** Read the current bindings (merge of defaults + user overrides). */
export function getBindings(): Readonly<Record<HotkeyAction, string>> {
  return bindings;
}

/** Lookup the key bound to `action`. */
export function getBinding(action: HotkeyAction): string {
  return bindings[action];
}

/**
 * Find the action a `key` is bound to, or null if none. Used by the
 * keydown handler to drive the dispatch.
 */
export function actionForKey(key: string): HotkeyAction | null {
  for (const [action, bound] of Object.entries(bindings) as Array<[HotkeyAction, string]>) {
    if (bound === key) return action;
  }
  return null;
}

/**
 * Set `action`'s binding to `key`. Returns:
 *   - 'ok' on success
 *   - 'collision' when `key` is already bound to a different action
 *   - 'unchanged' when the same value is written (no listener fires)
 */
export function setBinding(action: HotkeyAction, key: string): 'ok' | 'collision' | 'unchanged' {
  if (bindings[action] === key) return 'unchanged';
  for (const [other, bound] of Object.entries(bindings) as Array<[HotkeyAction, string]>) {
    if (other !== action && bound === key) return 'collision';
  }
  bindings = { ...bindings, [action]: key };
  for (const cb of listeners) cb(bindings);
  return 'ok';
}

/** Restore all bindings to DEFAULT_BINDINGS. Notifies subscribers. */
export function resetBindings(): void {
  bindings = { ...DEFAULT_BINDINGS };
  for (const cb of listeners) cb(bindings);
}

/**
 * Bulk replace from a persisted JSON blob. Unknown actions are
 * IGNORED (a future binding schema migration won't crash the load);
 * unknown keys (e.g. 'F1' in a future build) pass through.
 */
export function loadBindings(json: string | null | undefined): void {
  if (!json) return;
  try {
    const parsed = JSON.parse(json) as Partial<Record<HotkeyAction, string>>;
    if (!parsed || typeof parsed !== 'object') return;
    const next: Record<HotkeyAction, string> = { ...DEFAULT_BINDINGS };
    for (const action of Object.keys(DEFAULT_BINDINGS) as HotkeyAction[]) {
      const k = parsed[action];
      if (typeof k === 'string' && k.length > 0) next[action] = k;
    }
    bindings = next;
    for (const cb of listeners) cb(bindings);
  } catch {
    // corrupted blob — silently keep defaults (don't trap the user
    // in a broken keymap on a malformed Preferences row).
  }
}

/** Snapshot the current bindings as a JSON blob for persistence. */
export function serializeBindings(): string {
  return JSON.stringify(bindings);
}

/** Subscribe to binding changes. Returns unsubscribe. */
export function subscribeBindings(
  cb: (b: Readonly<Record<HotkeyAction, string>>) => void,
): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Test hook — reset between tests. */
export function _resetHotkeyBindingsForTests(): void {
  bindings = { ...DEFAULT_BINDINGS };
  listeners.clear();
}
