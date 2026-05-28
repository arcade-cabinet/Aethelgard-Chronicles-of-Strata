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
import { HUD_THEME } from './theme';

export type HudPillSlot = 'pause' | 'sound' | 'discoveries' | 'resign' | 'weather' | 'speed';

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
// M_AUDIT2.UX.18 — pill collision audit. The previous landscape row
// had 220→300→340→460 right offsets which is mathematically valid
// but visually crowded around the 300-340 step (only 40px of
// horizontal breathing room is not enough for the 'discoveries'
// pill text). Re-spaced with a constant 80px stride and the
// 'weather' pill inserted to the left of pause.
const SLOT_POSITIONS: Record<
  'landscape' | 'portrait' | 'tablet',
  Record<HudPillSlot, SlotPosition>
> = {
  // M_POLISH3.B.2 — pills crowded with 80px stride; "Pause" overlapped
  // "Audio" + "Discoveries" was clipped on 1280x720. Bump stride to
  // 110px (pill widths vary 70-110px; 110 gives an ~8-10px breathing
  // gap on the widest pills). 6 pills × 110px = 660px right-edge
  // budget — still fits inside the WinConditionPill's anchor at
  // approx right:660 (the centred "Destroy enemy base" chip).
  landscape: {
    weather: { top: 12, right: 700 },
    speed: { top: 12, right: 590 },
    pause: { top: 12, right: 480 },
    sound: { top: 12, right: 370 },
    discoveries: { top: 12, right: 260 },
    resign: { top: 12, right: 150 },
  },
  // M_POLISH2.B.2 — portrait layout overhaul. The previous layout
  // packed every pill into top:12 + top:56 + top:100 rows on the
  // right edge, where they overlapped the ResourceBar (now scroll-
  // snapped via MOBILE.2) AND the MobileSpeedPausePill (MOBILE.14,
  // top:8 right:8 spanning ~200px wide). Resolution:
  //   - resource bar sits at top:8 (compact) spanning ~250px width
  //   - MobileSpeedPausePill sits at top:8 right:8 spanning ~200px
  //   - HUD pills move BELOW that — top:56 row at minimum
  //   - sound/pause/speed are owned by MobileSpeedPausePill on
  //     portrait, so the HudPill table values for those slots are
  //     unused in practice; keep stable positions so a non-portrait
  //     viewport-class transition during a session doesn't pop
  //     pills to wrong places.
  portrait: {
    weather: { top: 56, right: 8 },
    speed: { top: 56, right: 72 }, // unused on portrait (MobileSpeedPausePill)
    pause: { top: 56, right: 136 }, // unused on portrait (MobileSpeedPausePill)
    sound: { top: 56, right: 80 }, // mounted by SoundToggle even on portrait
    discoveries: { top: 104, right: 8 },
    resign: { top: 104, right: 80 }, // unused on portrait (MobileSystemMenu)
  },
  // M_POLISH2.MOBILE.13a — tablet row. iPad Mini landscape (1024×768)
  // has more width than phone landscape; chips spaced 96px apart
  // (vs the desktop 80px stride) to take advantage. Sound + speed +
  // pause sit in the top-right cluster like desktop; discoveries +
  // resign on the second row to balance the side-docked
  // SelectionPanel from MOBILE.13b.
  tablet: {
    weather: { top: 12, right: 504 },
    speed: { top: 12, right: 408 },
    pause: { top: 12, right: 312 },
    sound: { top: 12, right: 216 },
    discoveries: { top: 60, right: 216 },
    resign: { top: 60, right: 8 },
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
  // M_POLISH2.MOBILE.13a — tablet row picked when viewport.class is
  // 'tablet'; otherwise fall back to portrait/landscape on isPortrait.
  const layoutKey: 'portrait' | 'landscape' | 'tablet' =
    viewport.class === 'tablet' ? 'tablet' : viewport.isPortrait ? 'portrait' : 'landscape';
  const pos = SLOT_POSITIONS[layoutKey][slot];
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
