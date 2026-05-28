/**
 * hud/selection — the selection + build-command surface
 * (M_V13.DECOMP.HUD-SELECTION).
 *
 * What the player sees once they tap a unit/building: the
 * SelectionPanel (with its train/build/research disabled-reason
 * helpers), multi-select stack actions, the idle-unit nudge, the
 * touch build-menu button, and the build-queue strip.
 *
 * selection-panel-reasons.ts is an internal helper consumed only by
 * SelectionPanel; it is intentionally not re-exported.
 */
export { SelectionPanel, type SelectionPanelProps } from './SelectionPanel';
export { MultiSelectActions } from './MultiSelectActions';
export { IdleUnitIndicator } from './IdleUnitIndicator';
export { BuildMenuButton } from './BuildMenuButton';
export { BuildQueueStrip } from './BuildQueueStrip';
