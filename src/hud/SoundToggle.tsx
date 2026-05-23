import { useEffect, useState } from 'react';
import { setMuted } from '@/audio/buses';
import { type Persistence, safePersistenceRead } from '@/persistence/persistence';
import { HUD_THEME } from './hud-theme';

/** The Preferences key the mute state is persisted under. */
export const MUTE_PREF_KEY = 'muted';

/**
 * The audio mute toggle (top-right). Calls `setMuted` and persists the choice
 * to Preferences so it survives a reload. On mount it restores the persisted
 * mute state.
 */
export function SoundToggle({ persistence }: { persistence: Persistence }) {
  const [muted, setMutedState] = useState(false);

  // restore the persisted mute state on mount.
  // M_SEC.15 — strict ternary: only `'true'` activates mute; any
  // other value (including a tampered Preferences string) defaults
  // to unmuted. safePersistenceRead also catches the read failure.
  useEffect(() => {
    let cancelled = false;
    void safePersistenceRead(
      persistence,
      MUTE_PREF_KEY,
      (raw) => raw === 'true',
      false,
      'SoundToggle',
    ).then((isMuted) => {
      if (cancelled) return;
      setMutedState(isMuted);
      setMuted(isMuted);
    });
    return () => {
      cancelled = true;
    };
  }, [persistence]);

  const toggle = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    void persistence.setSetting(MUTE_PREF_KEY, String(next));
  };

  return (
    <button
      type="button"
      id="sound-toggle"
      onClick={toggle}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: '8px 12px',
        borderRadius: 10,
        border: `1px solid ${HUD_THEME.color.border}`,
        background: HUD_THEME.color.panel,
        color: muted ? HUD_THEME.color.muted : HUD_THEME.color.accent,
        fontFamily: HUD_THEME.font.body,
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {muted ? '🔇 Audio OFF' : '🔊 Audio ON'}
    </button>
  );
}
