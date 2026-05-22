import { useState } from 'react';
import { HUD_THEME } from './hud-theme';

/** One legend entry — a coloured swatch + a one-line meaning. */
interface LegendRow {
  /** The visual swatch (a hex border, a pulse, a building aura). */
  swatch: React.ReactNode;
  /** What it means in-game. */
  label: string;
}

/** Faction colours mirror src/world/ZoneBorder.tsx. */
const PLAYER_COLOR = '#38bdf8';
const ENEMY_COLOR = '#f43f5e';

/** Render swatch helpers — tiny inline SVG so the legend is self-contained. */
function lineSwatch(color: string, dashed = false) {
  return (
    <svg width="18" height="10" aria-hidden>
      <line
        x1="1"
        y1="5"
        x2="17"
        y2="5"
        stroke={color}
        strokeWidth="2"
        strokeDasharray={dashed ? '3 2' : undefined}
      />
    </svg>
  );
}
function dotSwatch(color: string) {
  return (
    <svg width="18" height="10" aria-hidden>
      <circle cx="9" cy="5" r="4" fill={color} />
    </svg>
  );
}
function pulseSwatch(color: string) {
  return (
    <svg width="18" height="10" aria-hidden>
      <circle cx="9" cy="5" r="4" fill={color} opacity="0.6">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

const ROWS: LegendRow[] = [
  { swatch: lineSwatch(PLAYER_COLOR), label: 'Your zone of control' },
  { swatch: lineSwatch(ENEMY_COLOR), label: 'Enemy zone of control' },
  { swatch: pulseSwatch('#fde047'), label: 'Contested tile — defend it before it flips' },
  { swatch: dotSwatch(HUD_THEME.color.friendly), label: 'Your unit / building' },
  { swatch: dotSwatch('#a855f7'), label: 'Enemy base — destroy to win' },
];

/**
 * Compact bottom-left legend explaining the territory visual language to the
 * player (M9.1b). Collapsed by default to a small "?" pill so it doesn't
 * occlude the board; clicking expands the full table. Independent of any
 * game state — pure documentation.
 */
export function ZoneLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        top: 70,
        pointerEvents: 'auto',
        fontFamily: HUD_THEME.font.body,
        color: HUD_THEME.color.text,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: '4px 10px',
          borderRadius: 999,
          background: HUD_THEME.color.panel,
          border: `1px solid ${HUD_THEME.color.border}`,
          color: HUD_THEME.color.accent,
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
        aria-expanded={open}
        aria-label="Toggle territory legend"
      >
        {open ? '× Legend' : '? Legend'}
      </button>
      {open && (
        <div
          id="zone-legend"
          style={{
            marginTop: 6,
            padding: '10px 12px',
            borderRadius: HUD_THEME.radius,
            background: HUD_THEME.color.panel,
            border: `1px solid ${HUD_THEME.color.border}`,
            display: 'grid',
            gridTemplateColumns: '24px auto',
            rowGap: 6,
            columnGap: 8,
            fontSize: '0.72rem',
            minWidth: 220,
          }}
        >
          {ROWS.map((row) => (
            <div key={row.label} style={{ display: 'contents' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>{row.swatch}</div>
              <div>{row.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
