/**
 * useMutedPreference — single source of truth for the audio-mute
 * preference. Reads on mount, writes to Preferences + audio bus on
 * change, and broadcasts a 'aethelgard:sound-changed' CustomEvent
 * so any HUD surface (SystemMenu, legacy SoundToggle pill, future
 * picker) stays in sync without prop-drilling.
 *
 * The CustomEvent + window-scoped state lets the SystemMenu drawer
 * (which lives at HUD root) drive the mute toggle even though the
 * legacy SoundToggle pill is no longer mounted on most viewports.
 */
import { useEffect, useState } from 'react';
import { setMuted } from '@/audio/buses';
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';

export const MUTE_PREF_KEY = PREF_KEYS.muted;

/** Read + subscribe to the muted preference. Returns [muted, setMuted]. */
export function useMutedPreference(persistence: Persistence): [boolean, (next: boolean) => void] {
  const [muted, setMutedState] = useState(false);

  // Restore on mount + subscribe to cross-component flips.
  useEffect(() => {
    let cancelled = false;
    void safePersistenceRead(
      persistence,
      MUTE_PREF_KEY,
      (raw) => raw === 'true',
      false,
      'useMutedPreference',
    ).then((isMuted) => {
      if (cancelled) return;
      setMutedState(isMuted);
      setMuted(isMuted);
    });
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ muted: boolean }>).detail;
      if (typeof detail?.muted === 'boolean') setMutedState(detail.muted);
    };
    window.addEventListener('aethelgard:sound-changed', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('aethelgard:sound-changed', onChanged);
    };
  }, [persistence]);

  const apply = (next: boolean) => {
    setMutedState(next);
    setMuted(next);
    void persistence.setSetting(MUTE_PREF_KEY, String(next));
    window.dispatchEvent(new CustomEvent('aethelgard:sound-changed', { detail: { muted: next } }));
  };

  return [muted, apply];
}
