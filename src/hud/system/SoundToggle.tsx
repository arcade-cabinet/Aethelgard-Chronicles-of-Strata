import { useEffect, useState } from 'react';
import { setMuted } from '@/audio/buses';
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';
import { HudPill } from '../primitives';

/** The Preferences key the mute state is persisted under. */
// M_SEC.33 — Preferences keys are namespaced via the PREF_KEYS enum.
export const MUTE_PREF_KEY = PREF_KEYS.muted;

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

  // M_AUDIT2.UX.27 — render through HudPill so the slot table
  // (SLOT_POSITIONS.{landscape,portrait}.sound) is the single source
  // of position truth. Was a hand-coded `position: absolute; top: 16;
  // right: 16` that collided with the pause pill on landscape and
  // the resource bar on portrait.
  return (
    <HudPill
      slot="sound"
      id="sound-toggle"
      ariaLabel={muted ? 'Unmute audio' : 'Mute audio'}
      onClick={toggle}
      variant={muted ? 'default' : 'default'}
    >
      {muted ? '🔇 Audio OFF' : '🔊 Audio ON'}
    </HudPill>
  );
}
