/**
 * hud/theme/hud-layout — shared HUD positioning slots
 * (M_V13.HUD.FIX-PILL-COLLISION).
 *
 * The top-center column stacks several pills (the N-player FactionChips
 * strip + the ScoreBar). Before this, each hard-coded `top: 12` /
 * `top: calc(safe + 8)` independently, so in N-player matches the chips
 * strip rendered ON TOP of the score bar (review Major #1). These
 * helpers assign each surface a fixed vertical slot in the top-center
 * column so they stack instead of collide.
 *
 * Slot order (top → down): factionChips (row 0), scoreBar (row 1).
 * FactionChips only renders in N-player matches (>2 factions); when it
 * is absent the score bar still sits at row 1 — a small, consistent
 * gap below the safe-area top either way, which reads as intentional
 * breathing room rather than a layout jump.
 */
import { HUD_THEME, safeTop } from './hud-theme';

/** Estimated height (px) of one top-center pill row incl. its gap. */
const TOP_ROW_HEIGHT = 36;

/**
 * Absolute-position props for a centered surface in the top-center
 * column at the given row (0-based). Returns the inline-style triplet
 * (top/left/transform) every top-center pill shares, with `top`
 * computed from the safe-area inset + the row offset.
 */
export function topCenterSlot(row: number): {
  position: 'absolute';
  top: string;
  left: string;
  transform: string;
} {
  return {
    position: 'absolute',
    top: safeTop(HUD_THEME.space.sm + row * TOP_ROW_HEIGHT),
    left: '50%',
    transform: 'translateX(-50%)',
  };
}

/** Named rows in the top-center column, so callers don't pass magic ints. */
export const TOP_CENTER_SLOT = {
  factionChips: 0,
  scoreBar: 1,
} as const;
