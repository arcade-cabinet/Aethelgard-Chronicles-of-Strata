/**
 * The Aethelgard HUD design tokens — the obsidian/gold "epic fantasy" palette
 * and typography lifted from poc2.html's CSS `:root`. Imported by every HUD
 * component so the launcher, resource bar, selection panel, and modals share
 * one visual language.
 */
export const HUD_THEME = {
  /** Colors. */
  color: {
    /** Deepest background — obsidian. */
    obsidian: '#090d16',
    /** Panel background. */
    panel: 'rgba(9, 13, 22, 0.88)',
    /** Panel border. */
    border: 'rgba(56, 189, 248, 0.28)',
    /** Primary text. */
    text: '#f1f5f9',
    /** Muted text. */
    muted: '#94a3b8',
    /** Accent blue. */
    accent: '#38bdf8',
    /** Gold — headings, victory. */
    gold: '#fbbf24',
    /** Wood resource. */
    wood: '#f97316',
    /** Stone resource. */
    stone: '#94a3b8',
    /** Gold resource. */
    coin: '#fbbf24',
    /** Supply. */
    supply: '#a855f7',
    /** Friendly / positive. */
    friendly: '#4ade80',
    /** Danger / defeat. */
    danger: '#ef4444',
  },
  /** Typography. */
  font: {
    /** Display / heading font — epic fantasy serif. */
    display: "'Metamorphous', serif",
    /** Body / UI font. */
    body: "'Inter', sans-serif",
  },
  /** The gold title gradient (poc2 launcher h1). */
  goldGradient: 'linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
  /** The blue button gradient (poc2 launch button). */
  blueGradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
  /** Standard panel radius. */
  radius: 12,
} as const;

/**
 * Shared "card" style — panel background + accent border + standard
 * radius + body font + text color (M_MICRO.10.3). Reach for this when
 * a component needs the project's panel look; per-card overrides (e.g.
 * absolute positioning, custom padding) extend via spread.
 *
 * Was duplicated across TitleScreen page-shell, SelectionPanel
 * motion.div card, and several modal contents (now centralised here
 * AND in ModalShell — M_MICRO.10.1).
 */
export const HUD_CARD_STYLE = {
  background: HUD_THEME.color.panel,
  border: `1px solid ${HUD_THEME.color.border}`,
  borderRadius: HUD_THEME.radius,
  color: HUD_THEME.color.text,
  fontFamily: HUD_THEME.font.body,
} as const;
