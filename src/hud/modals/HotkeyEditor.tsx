import { useEffect, useState } from 'react';
import {
  DEFAULT_BINDINGS,
  getBindings,
  type HotkeyAction,
  resetBindings,
  serializeBindings,
  setBinding,
  subscribeBindings,
} from '../hotkey-bindings';
import { HUD_THEME } from '../theme';

/** Display labels for each action. Order matches the rendered list. */
const ACTION_ROWS: ReadonlyArray<{ action: HotkeyAction; label: string }> = [
  { action: 'build.menu', label: 'Open build menu' },
  { action: 'build.Farm', label: 'Build Farm' },
  { action: 'build.House', label: 'Build House' },
  { action: 'build.Granary', label: 'Build Granary' },
  { action: 'build.Barracks', label: 'Build Barracks' },
  { action: 'build.Watchtower', label: 'Build Watchtower' },
  { action: 'build.Wall', label: 'Build Wall' },
  { action: 'select.clear', label: 'Clear selection' },
  { action: 'camera.zoom-in', label: 'Camera zoom in' },
  { action: 'camera.zoom-out', label: 'Camera zoom out' },
];

/**
 * M_EXPANSION.U.115 — HotkeyEditor.
 *
 * One row per action; clicking a row enters "press a key" mode for
 * that action. The next keystroke captured globally becomes the new
 * binding (unless it collides with another action, in which case the
 * row flashes a brief collision indicator and stays on its previous
 * key). Reset button restores defaults. Persists via the
 * `onChange` prop — caller writes the JSON blob to Preferences.
 */
export interface HotkeyEditorProps {
  /** Fired after EVERY accepted binding write, with the new JSON blob. */
  onChange: (json: string) => void;
}

export function HotkeyEditor({ onChange }: HotkeyEditorProps) {
  const [bindings, setBindingsState] = useState(getBindings());
  const [listeningFor, setListeningFor] = useState<HotkeyAction | null>(null);
  const [collisionFor, setCollisionFor] = useState<HotkeyAction | null>(null);

  useEffect(() => {
    const unsub = subscribeBindings((next) => setBindingsState({ ...next }));
    return unsub;
  }, []);

  useEffect(() => {
    if (!listeningFor) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const key = e.key === ' ' ? ' ' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const result = setBinding(listeningFor, key);
      if (result === 'collision') {
        setCollisionFor(listeningFor);
        window.setTimeout(() => setCollisionFor(null), 900);
      } else if (result === 'ok') {
        onChange(serializeBindings());
      }
      setListeningFor(null);
    };
    // Capture phase so KeyboardShortcuts doesn't ALSO fire on the rebind keystroke.
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [listeningFor, onChange]);

  const onReset = () => {
    resetBindings();
    onChange(serializeBindings());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ACTION_ROWS.map((row) => {
        const isListening = listeningFor === row.action;
        const isCollision = collisionFor === row.action;
        const isDefault = bindings[row.action] === DEFAULT_BINDINGS[row.action];
        return (
          <div
            key={row.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              fontSize: '0.78rem',
              gap: 8,
            }}
          >
            <span style={{ color: HUD_THEME.color.muted, flex: 1 }}>{row.label}</span>
            <button
              type="button"
              aria-label={`Rebind ${row.label} (currently ${bindings[row.action]})`}
              onClick={() => setListeningFor(isListening ? null : row.action)}
              style={{
                minWidth: 78,
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${isCollision ? HUD_THEME.color.danger : HUD_THEME.color.border}`,
                background: isListening ? 'rgba(56,189,248,0.22)' : 'rgba(56,189,248,0.08)',
                color: isDefault ? HUD_THEME.color.muted : HUD_THEME.color.accent,
                fontFamily: HUD_THEME.font.body,
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {isCollision
                ? 'in use'
                : isListening
                  ? 'press a key…'
                  : prettyKey(bindings[row.action])}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onReset}
        style={{
          marginTop: 6,
          padding: '8px',
          borderRadius: 8,
          border: `1px solid ${HUD_THEME.color.border}`,
          background: 'rgba(56,189,248,0.06)',
          color: HUD_THEME.color.muted,
          fontFamily: HUD_THEME.font.body,
          fontSize: '0.78rem',
          cursor: 'pointer',
        }}
      >
        Restore default hotkeys
      </button>
    </div>
  );
}

/** Title-case a key name so 'escape' renders as 'Esc' etc. */
function prettyKey(key: string): string {
  if (key === 'Escape') return 'Esc';
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}
