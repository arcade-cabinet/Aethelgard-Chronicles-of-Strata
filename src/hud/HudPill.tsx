/**
 * M_MICRO.10.2 — shared HUD pill button.
 *
 * The top-right HUD chips (DiscoveriesPanel trigger, ResignButton,
 * PauseControl) share a fixed-position pill silhouette with the same
 * padding, border-radius, font, and stacking math. The viewport-aware
 * top/right placement was repeated across all three with subtly
 * different constants — a portrait phone got a different stack than a
 * landscape tablet, but the stack math was hand-written per component.
 *
 * HudPill takes a `slot` index that maps to (top, right) via a single
 * stack table per orientation. Per-pill colour overrides come through
 * props; the shell holds the project's pill defaults.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useViewport } from '@/render/useViewport';
import { HUD_THEME } from './hud-theme';

export type HudPillSlot = 'pause' | 'sound' | 'discoveries' | 'resign';

interface SlotPosition {
  /** Pixels from top of viewport. */
  top: number;
  /** Pixels from right of viewport. */
  right: number;
}

/**
 * Per-slot positions per viewport orientation. The order of slots in
 * each row reads left → right (smaller `right:` = closer to the edge).
 * Adding a fourth or fifth pill = ONE row in this table; the consumers
 * just pass the new slot name.
 */
const SLOT_POSITIONS: Record<'landscape' | 'portrait', Record<HudPillSlot, SlotPosition>> = {
  landscape: {
    pause: { top: 12, right: 220 },
    sound: { top: 12, right: 300 },
    discoveries: { top: 12, right: 340 },
    resign: { top: 12, right: 460 },
  },
  portrait: {
    pause: { top: 12, right: 72 },
    sound: { top: 12, right: 144 },
    discoveries: { top: 52, right: 8 },
    resign: { top: 96, right: 8 },
  },
};

export interface HudPillProps {
  /** Stacking slot — the table picks (top, right) per viewport. */
  slot: HudPillSlot;
  /** Pill label (icon + text). */
  children: ReactNode;
  /** Click handler (optional — pills used as Dialog.Trigger pass asChild). */
  onClick?: () => void;
  /** Button id for tests + analytics. */
  id?: string;
  /** Accessibility label override. */
  ariaLabel?: string;
  /**
   * Visual variant — `default` (accent text on panel bg), `danger`
   * (red text on panel bg), `active` (panel text on accent bg).
   */
  variant?: 'default' | 'danger' | 'active';
  /** Extra style merged onto the pill (rare — variants cover most cases). */
  style?: CSSProperties;
  /** Forward type to the underlying button (defaults to "button"). */
  type?: 'button' | 'submit';
}

/** A single HUD pill button. */
export function HudPill({
  slot,
  children,
  onClick,
  id,
  ariaLabel,
  variant = 'default',
  style,
  type = 'button',
}: HudPillProps) {
  const viewport = useViewport();
  const pos = SLOT_POSITIONS[viewport.isPortrait ? 'portrait' : 'landscape'][slot];
  const variantStyle: CSSProperties =
    variant === 'danger'
      ? {
          color: '#f87171',
          border: '1px solid rgba(248,113,113,0.35)',
          background: HUD_THEME.color.panel,
        }
      : variant === 'active'
        ? {
            color: '#000',
            border: `1px solid ${HUD_THEME.color.border}`,
            background: HUD_THEME.color.accent,
          }
        : {
            color: HUD_THEME.color.accent,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: HUD_THEME.color.panel,
          };
  return (
    <button
      type={type}
      id={id}
      data-hud-panel
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: pos.top,
        right: pos.right,
        zIndex: 6,
        padding: '6px 14px',
        borderRadius: 999,
        fontFamily: HUD_THEME.font.body,
        fontSize: '0.78rem',
        fontWeight: 700,
        cursor: 'pointer',
        pointerEvents: 'auto',
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
