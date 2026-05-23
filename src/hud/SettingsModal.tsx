import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { setMuted } from '@/audio/buses';
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';
import { MUTE_PREF_KEY } from './SoundToggle';

/** Props for the Settings modal. */
export interface SettingsModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal requests to close. */
  onOpenChange: (open: boolean) => void;
  /** Persistence facade — stores the audio setting. */
  persistence: Persistence;
}

/**
 * The Settings modal (Radix Dialog) — currently the audio mute toggle, stored
 * in Capacitor Preferences so it survives a reload. Map-size and other visual
 * options will extend this panel.
 */
export function SettingsModal({ open, onOpenChange, persistence }: SettingsModalProps) {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // M_MICRO.B.1 — fallback to "not muted" if the read fails (a corrupt
    // SQLite row shouldn't lock the user into a silent game).
    void safePersistenceRead(
      persistence,
      MUTE_PREF_KEY,
      (raw) => raw === 'true',
      false,
      'SettingsModal',
    ).then((mutedValue) => {
      if (!cancelled) setMutedState(mutedValue);
    });
    return () => {
      cancelled = true;
    };
  }, [persistence]);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    void persistence.setSetting(MUTE_PREF_KEY, String(next));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {/* M_MICRO.10.1 — ModalShell unifies the dialog card. */}
      <ModalShell
        zIndex={200}
        width="min(380px, 92vw)"
        maxHeight="none"
        contentStyle={{
          border: `1px solid ${HUD_THEME.color.border}`,
          borderRadius: 16,
          padding: 28,
          fontFamily: HUD_THEME.font.body,
        }}
      >
        <Dialog.Title
          style={{
            fontFamily: HUD_THEME.font.display,
            fontSize: '1.4rem',
            color: HUD_THEME.color.gold,
            margin: '0 0 18px',
          }}
        >
          Settings
        </Dialog.Title>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>Audio</span>
          <button
            type="button"
            id="settings-mute"
            // M_AUDIT2.UX.2 — explicit aria-label; the emoji prefix
            // ("🔇 Audio OFF") is not a reliable SR announcement.
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            aria-pressed={muted}
            onClick={toggleMute}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${HUD_THEME.color.border}`,
              background: 'rgba(56,189,248,0.12)',
              color: muted ? HUD_THEME.color.muted : HUD_THEME.color.accent,
              fontFamily: HUD_THEME.font.body,
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {muted ? '🔇 Audio OFF' : '🔊 Audio ON'}
          </button>
        </div>

        {/* M_AUDIT2.UX.41 — Replay tutorial. Clears the
              `aethelgard.onboardingSeen` Preference; on the next page
              load (or new game) the OnboardingOverlay re-opens because
              its first render checks the same key. */}
        <button
          type="button"
          id="settings-replay-tutorial"
          onClick={() => {
            void persistence.setSetting(PREF_KEYS.onboarding, '');
            onOpenChange(false);
          }}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '10px',
            borderRadius: 10,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(56,189,248,0.06)',
            color: HUD_THEME.color.muted,
            fontFamily: HUD_THEME.font.body,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Replay tutorial on next session
        </button>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '12px',
            borderRadius: 10,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(56,189,248,0.14)',
            color: HUD_THEME.color.accent,
            fontFamily: HUD_THEME.font.body,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </ModalShell>
    </Dialog.Root>
  );
}
