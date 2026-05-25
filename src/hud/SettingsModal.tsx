import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { type AudioBuses, getBusVolume, setBusVolume, setMuted } from '@/audio/buses';
import { MUTE_PREF_KEY } from '@/audio/useMutedPreference';
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';
import { isColorblindMode, setColorblindMode } from '@/rules/colorblind';
import { isCaptionsEnabled, setCaptionsEnabled } from './captions';
import { HotkeyEditor } from './HotkeyEditor';
import { loadBindings } from './hotkey-bindings';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';

// M_EXPANSION.U.112 — bus → (preference key, label) mapping.
const BUS_ROWS: ReadonlyArray<{
  bus: keyof AudioBuses;
  key: string;
  label: string;
}> = [
  { bus: 'sfx', key: PREF_KEYS.volSfx, label: 'Effects' },
  { bus: 'music', key: PREF_KEYS.volMusic, label: 'Music' },
  { bus: 'ambient', key: PREF_KEYS.volAmbient, label: 'Ambient' },
  { bus: 'ui', key: PREF_KEYS.volUi, label: 'Interface' },
];

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
  const [colorblind, setColorblindState] = useState<boolean>(() => isColorblindMode());
  const [captions, setCaptionsState] = useState<boolean>(() => isCaptionsEnabled());
  const [volumes, setVolumes] = useState<Record<keyof AudioBuses, number>>(() => ({
    sfx: getBusVolume('sfx'),
    music: getBusVolume('music'),
    ambient: getBusVolume('ambient'),
    ui: getBusVolume('ui'),
  }));

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
    // M_EXPANSION.U.113 — load colourblind mode and push into the registry.
    void safePersistenceRead(
      persistence,
      PREF_KEYS.colorblind,
      (raw) => raw === 'true',
      false,
      'SettingsModal',
    ).then((cb) => {
      if (cancelled) return;
      setColorblindMode(cb);
      setColorblindState(cb);
    });
    // M_EXPANSION.U.114 — load captions toggle and push into the registry.
    void safePersistenceRead(
      persistence,
      PREF_KEYS.captions,
      (raw) => raw === 'true',
      false,
      'SettingsModal',
    ).then((cb) => {
      if (cancelled) return;
      setCaptionsEnabled(cb);
      setCaptionsState(cb);
    });
    // M_EXPANSION.U.115 — load remapped hotkey bindings.
    void safePersistenceRead(
      persistence,
      PREF_KEYS.hotkeyBindings,
      (raw) => raw,
      '',
      'SettingsModal',
    ).then((json) => {
      if (cancelled) return;
      if (json) loadBindings(json);
    });
    // M_EXPANSION.U.112 — load each bus volume from persistence on mount
    // and push the read value into the buses module so subsequently-
    // created bus instances pick it up before the first sound plays.
    for (const row of BUS_ROWS) {
      void safePersistenceRead(
        persistence,
        row.key,
        (raw) => {
          // M_POLISH2.m.4 — empty string from a never-set Preference
          // parses as Number('') === 0 which silently zeroed every
          // slider on first mount (interpreted as "user dragged to
          // 0"). Trim + length-check FIRST so a missing key falls
          // back to the bus default instead of muting.
          const trimmed = (raw ?? '').trim();
          if (trimmed.length === 0) return getBusVolume(row.bus);
          const n = Number(trimmed);
          if (!Number.isFinite(n)) return getBusVolume(row.bus);
          return Math.max(0, Math.min(1, n));
        },
        getBusVolume(row.bus),
        'SettingsModal',
      ).then((v) => {
        if (cancelled) return;
        setBusVolume(row.bus, v);
        setVolumes((prev) => ({ ...prev, [row.bus]: v }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [persistence]);

  const onVolumeChange = (bus: keyof AudioBuses, key: string, value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumes((prev) => ({ ...prev, [bus]: clamped }));
    setBusVolume(bus, clamped);
    void persistence.setSetting(key, String(clamped));
  };

  const toggleColorblind = () => {
    const next = !colorblind;
    setColorblindState(next);
    setColorblindMode(next);
    void persistence.setSetting(PREF_KEYS.colorblind, String(next));
  };

  const toggleCaptions = () => {
    const next = !captions;
    setCaptionsState(next);
    setCaptionsEnabled(next);
    void persistence.setSetting(PREF_KEYS.captions, String(next));
  };

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
        // M_POLISH2.MOBILE.7 — bound the modal height so the body
        // scrolls if it grows past the viewport (settings panel keeps
        // growing as we ship more toggles). The sticky Done bar at
        // bottom-of-modal stays visible above the safe-area inset.
        maxHeight="min(85vh, 720px)"
        contentStyle={{
          border: `1px solid ${HUD_THEME.color.border}`,
          borderRadius: 16,
          padding: 28,
          paddingBottom: 0, // sticky footer owns its own bottom spacing
          fontFamily: HUD_THEME.font.body,
          overflowY: 'auto',
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

        {/* M_EXPANSION.U.112 — per-bus volume sliders. Disabled (and
            visually muted) when the global mute toggle is on — sliders
            still respond to drag and persist the value, so unmuting
            restores the user's chosen mix. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '6px 0 4px',
            opacity: muted ? 0.45 : 1,
          }}
        >
          {BUS_ROWS.map((row) => (
            <label
              key={row.bus}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.8rem',
                color: HUD_THEME.color.muted,
              }}
            >
              <span style={{ flex: '0 0 64px' }}>{row.label}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumes[row.bus]}
                aria-label={`${row.label} volume`}
                onChange={(e) => onVolumeChange(row.bus, row.key, Number(e.target.value))}
                style={{ flex: 1, accentColor: HUD_THEME.color.accent }}
                data-testid={`settings-volume-${row.bus}`}
              />
              <span
                style={{
                  flex: '0 0 36px',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: HUD_THEME.color.accent,
                }}
              >
                {Math.round(volumes[row.bus] * 100)}
              </span>
            </label>
          ))}
        </div>

        {/* M_EXPANSION.U.113 — colourblind mode toggle. The
            deuteranopia/protanopia/tritanopia-safe palette remaps
            player → orange, enemy → cyan. The setting is read on
            mount + flips the global isColorblindMode() flag that
            Units.tsx (and any future faction-coloured renderer)
            consults on snapshot. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderTop: `1px solid ${HUD_THEME.color.border}`,
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>Colourblind mode</span>
          <button
            type="button"
            id="settings-colorblind"
            aria-label={colorblind ? 'Disable colourblind palette' : 'Enable colourblind palette'}
            aria-pressed={colorblind}
            onClick={toggleColorblind}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${HUD_THEME.color.border}`,
              background: 'rgba(56,189,248,0.12)',
              color: colorblind ? HUD_THEME.color.accent : HUD_THEME.color.muted,
              fontFamily: HUD_THEME.font.body,
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {colorblind ? '✓ On' : 'Off'}
          </button>
        </div>

        {/* M_EXPANSION.U.114 — captions toggle. When ON, a small
            band at the bottom of the screen surfaces a short caption
            for each critical sound event (combat hits, building
            completed, victory/defeat, etc). Default off. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderTop: `1px solid ${HUD_THEME.color.border}`,
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>Captions / subtitles</span>
          <button
            type="button"
            id="settings-captions"
            aria-label={captions ? 'Disable captions' : 'Enable captions'}
            aria-pressed={captions}
            onClick={toggleCaptions}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${HUD_THEME.color.border}`,
              background: 'rgba(56,189,248,0.12)',
              color: captions ? HUD_THEME.color.accent : HUD_THEME.color.muted,
              fontFamily: HUD_THEME.font.body,
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {captions ? '✓ On' : 'Off'}
          </button>
        </div>

        {/* M_EXPANSION.U.115 — keyboard rebinding editor. Renders
            one row per remappable action; clicking a row enters
            "press a key" mode; the next keystroke becomes the new
            binding (collisions are rejected). Reset restores
            defaults. The serialized JSON is persisted on every
            accepted change. */}
        <div
          style={{
            padding: '10px 0',
            borderTop: `1px solid ${HUD_THEME.color.border}`,
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: HUD_THEME.color.muted,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            Keyboard shortcuts
          </div>
          <HotkeyEditor
            onChange={(json) => {
              void persistence.setSetting(PREF_KEYS.hotkeyBindings, json);
            }}
          />
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

        {/* M_POLISH2.MOBILE.7 — one-handed reachability. The Done
            button is sticky at the bottom of the modal with a
            safe-area-inset-bottom padding so on a 6.7" portrait
            phone the thumb can reach it without two-handed grip.
            Position: sticky + bottom: 0 keeps it visible even if
            the modal body scrolls (e.g. with the hotkey editor
            making the panel taller than the viewport). */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 14,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            background: `linear-gradient(to top, ${HUD_THEME.color.panel} 78%, transparent)`,
          }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: `1px solid ${HUD_THEME.color.border}`,
              background: 'rgba(56,189,248,0.18)',
              color: HUD_THEME.color.accent,
              fontFamily: HUD_THEME.font.body,
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              // 44px minimum touch target (14px padding × 2 + 16px
              // font line height = ~44px; nudge to be safe).
              minHeight: 48,
            }}
          >
            Done
          </button>
        </div>
      </ModalShell>
    </Dialog.Root>
  );
}
