/**
 * useTheme — single source of truth for the Aethelgard color scheme.
 *
 * Resolution order (first non-null wins):
 *   1. Persisted user override (Preferences key 'theme': 'dark' | 'light')
 *   2. Capacitor Device.getInfo() preferred color scheme (mobile native)
 *   3. matchMedia('(prefers-color-scheme: dark)') (web/Electron)
 *   4. Fallback 'dark'
 *
 * Applies the resolved theme to the root `<html data-theme="…">` so the
 * Tailwind v4 `[data-theme='light']` selector switches the entire token
 * palette in one place. Broadcasts `aethelgard:theme-changed` so any
 * surface that needs to react (audio bus damping, r3f environment swap,
 * etc.) can subscribe without prop-drilling.
 */
import { useEffect, useState } from 'react';
import type { Persistence } from '@/persistence/persistence';
import { PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';

export type ThemeName = 'dark' | 'light';

const THEME_KEY = PREF_KEYS.theme;

/** Apply the theme to <html data-theme="…">. Safe to call from any thread. */
function applyTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new CustomEvent('aethelgard:theme-changed', { detail: { theme } }));
}

/** Read the system preference from matchMedia (web). */
function systemTheme(): ThemeName {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Resolve the OS preference via matchMedia (web + Capacitor WebView). */
async function osTheme(): Promise<ThemeName> {
  // Capacitor 7+ exposes the system scheme to the WebView via
  // matchMedia('(prefers-color-scheme)') natively, so we don't need
  // the @capacitor/status-bar plugin — matchMedia covers both web and
  // native runtimes.
  return systemTheme();
}

/**
 * Subscribe to theme changes. Returns the current theme + a setter that
 * persists the override + applies + broadcasts.
 */
export function useTheme(
  persistence?: Persistence,
): [ThemeName, (next: ThemeName | 'system') => void] {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    // First paint: best guess from matchMedia. The async resolver below
    // refines it within a tick.
    return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
      ? 'light'
      : 'dark';
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 1. Persisted user override?
      let resolved: ThemeName | null = null;
      if (persistence) {
        resolved = await safePersistenceRead<ThemeName | null>(
          persistence,
          THEME_KEY,
          (raw) => (raw === 'light' || raw === 'dark' ? raw : null),
          null,
          'useTheme',
        );
      }
      // 2. OS preference fallback.
      if (!resolved) resolved = await osTheme();
      if (cancelled) return;
      setThemeState(resolved);
      applyTheme(resolved);
    })();
    // 3. Listen for OS-level scheme changes (matchMedia change event).
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    const onChange = () => {
      // Only auto-flip when there's no persisted user override.
      if (!persistence) {
        const next = systemTheme();
        setThemeState(next);
        applyTheme(next);
        return;
      }
      void safePersistenceRead<ThemeName | null>(
        persistence,
        THEME_KEY,
        (raw) => (raw === 'light' || raw === 'dark' ? raw : null),
        null,
        'useTheme',
      ).then((override) => {
        if (override) return; // user pinned a theme — don't override
        const next = systemTheme();
        setThemeState(next);
        applyTheme(next);
      });
    };
    mq?.addEventListener('change', onChange);
    // 4. Cross-surface listener — keep multiple useTheme instances in sync.
    const onBroadcast = (e: Event) => {
      const detail = (e as CustomEvent<{ theme: ThemeName }>).detail;
      if (detail?.theme) setThemeState(detail.theme);
    };
    window.addEventListener('aethelgard:theme-changed', onBroadcast);
    return () => {
      cancelled = true;
      mq?.removeEventListener('change', onChange);
      window.removeEventListener('aethelgard:theme-changed', onBroadcast);
    };
  }, [persistence]);

  const setTheme = (next: ThemeName | 'system') => {
    if (next === 'system') {
      // Clear the override + adopt OS preference now.
      if (persistence) void persistence.setSetting(THEME_KEY, '');
      void osTheme().then((t) => {
        setThemeState(t);
        applyTheme(t);
      });
      return;
    }
    setThemeState(next);
    applyTheme(next);
    if (persistence) void persistence.setSetting(THEME_KEY, next);
  };

  return [theme, setTheme];
}
