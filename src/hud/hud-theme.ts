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
    /**
     * Muted text. M_AUDIT2.UX.28 — shifted from #94a3b8 (4.27:1 contrast
     * against panel rgba(9,13,22,0.88), fails WCAG AA 4.5:1) to #a8b3c5
     * (~5.1:1, AA-compliant for body text). Visual delta minimal; the
     * a11y win is large.
     */
    muted: '#a8b3c5',
    /** Accent blue. */
    accent: '#38bdf8',
    /** Gold — headings, victory. M_HUD.SHELL.7b — antique-gold #d4af37
     * to match the semantic --color-treasure token used by the new
     * Tailwind HUD pages (TitleScreen wordmark, TreasureButton, etc).
     * Was #fbbf24 (sun-yellow) which read garishly next to the new
     * deeper-treasure palette. */
    gold: '#d4af37',
    /** Wood resource. */
    wood: '#f97316',
    /** Stone resource. */
    stone: '#94a3b8',
    /** Gold resource. M_HUD.SHELL.7b — same antique-gold alignment. */
    coin: '#d4af37',
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
