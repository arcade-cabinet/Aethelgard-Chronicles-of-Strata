/**
 * Distilled HUD primitives subpackage (M_HUD.SHELL.10).
 *
 * Patterns surfaced by the 21st.dev Magic explorations during the
 * v0.10 cycle — extracted here as reusable components instead of
 * being re-implemented per page.
 */

export { BottomShelf, type BottomShelfProps } from './BottomShelf';
export { Halo, type HaloProps, type HaloTone } from './Halo';
export { HeroBanner, type HeroBannerProps } from './HeroBanner';
export { IconButton, type IconButtonProps } from './IconButton';
export { SectionCard, type SectionCardProps } from './SectionCard';
export { StepProgressDots, type StepProgressDotsProps } from './StepProgressDots';
export { TreasureButton, type TreasureButtonProps } from './TreasureButton';
// M_V13.DECOMP.HUD-PRIMITIVES — folded the top-level shared shells
// (ModalShell, HudPill, Segmented) into this package.
export { ModalShell, type ModalShellProps } from './ModalShell';
export { HudPill, type HudPillProps, type HudPillSlot } from './HudPill';
export { Segmented } from './Segmented';
