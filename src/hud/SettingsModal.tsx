import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { setMuted } from '@/audio/buses';
import type { Persistence } from '@/persistence/persistence';
import { HUD_THEME } from './hud-theme';
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
    void persistence.getSetting(MUTE_PREF_KEY).then((value) => {
      if (!cancelled) setMutedState(value === 'true');
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
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.8)', zIndex: 200 }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(380px, 92vw)',
            background: HUD_THEME.color.panel,
            border: `1px solid ${HUD_THEME.color.border}`,
            borderRadius: 16,
            padding: 28,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            zIndex: 201,
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

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              width: '100%',
              marginTop: 18,
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
