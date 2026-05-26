/**
 * useDesktopShortcuts — opt-in keyboard nav for desktop-only screens
 * (M_HUD.SHELL.15).
 *
 * Mobile-first doctrine: keyboard shortcuts MUST NOT be the only path
 * to any feature, and MUST NOT be advertised in the UI. They're a
 * silent convenience for desktop users; mobile users tap.
 *
 * Pattern: wrap any window-keydown listener through this hook, and
 * gate the consumer at the call site on `viewport.class === 'desktop'
 * || 'ultraWide'`. The component that uses this hook is itself
 * mounted only on those classes; tests + Maestro flows never rely
 * on the shortcuts.
 */
import { useEffect } from 'react';

export interface DesktopShortcut {
  /** Lowercase key name from KeyboardEvent.key (e.g. 'enter', 'escape', '?'). */
  key: string;
  /** Callback fired when the key matches AND focus isn't in an input. */
  onMatch: () => void;
}

/**
 * Wire one or more global keyboard shortcuts. Skips when the active
 * element is an editable input / textarea so typing into a seed field
 * doesn't accidentally trigger nav.
 */
export function useDesktopShortcuts(shortcuts: DesktopShortcut[], enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      for (const s of shortcuts) {
        if (s.key === k) {
          s.onMatch();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcuts, enabled]);
}
