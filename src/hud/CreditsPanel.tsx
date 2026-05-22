import { assets } from '@/assets/assets';
import { HUD_THEME } from './hud-theme';

/**
 * The credits panel — lists every asset pack and its license, derived from the
 * committed asset manifest via `assets.credits()`. Shown from the launcher and
 * the game-over modal. Always includes the KayKit attribution the CC-BY license
 * requires.
 */
export function CreditsPanel({ onClose }: { onClose?: () => void }) {
  const credits = assets.credits();
  return (
    <div
      id="credits-panel"
      style={{
        background: HUD_THEME.color.panel,
        border: `1px solid ${HUD_THEME.color.border}`,
        borderRadius: HUD_THEME.radius,
        padding: 20,
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.body,
        maxWidth: 360,
      }}
    >
      <div
        style={{
          fontFamily: HUD_THEME.font.display,
          fontSize: '1.1rem',
          color: HUD_THEME.color.gold,
          marginBottom: 10,
        }}
      >
        Credits
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.8rem' }}>
        {credits.map((c) => (
          <li
            key={`${c.pack}::${c.license}`}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span>{c.pack}</span>
            <span style={{ color: HUD_THEME.color.muted }}>{c.license}</span>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted, marginTop: 10 }}>
        KayKit by Kay Lousberg. Kenney kits (CC0). PixelLoops Audio (royalty-free).
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            borderRadius: 8,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(56,189,248,0.14)',
            color: HUD_THEME.color.accent,
            fontFamily: HUD_THEME.font.body,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      )}
    </div>
  );
}
