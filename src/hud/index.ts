/**
 * hud — the top-level HUD barrel (M_V13.DECOMP.HUD-BARREL).
 *
 * Re-exports every HUD sub-package so consumers can import any HUD
 * surface from a single `@/hud` entry point. The decomposition (v0.13)
 * split the former 87-file flat directory into eight feature
 * sub-packages, each with its own barrel:
 *
 *   theme       design tokens + formatters (HUD_THEME, costLabel, …)
 *   primitives  shared building blocks (ModalShell, HudPill, Segmented…)
 *   pills       top-bar status pills (ScoreBar, FactionChips, …)
 *   setup       new-game configuration surface
 *   selection   selection + build-command surface
 *   overlays    full-bleed surfaces (title, loading, tutorial, toasts…)
 *   system      persistent control + status chrome
 *   modals      dialog + full-panel surfaces
 *
 * HudLayer (the mount-wall composer) and the cross-cutting helper
 * modules (buses, stores, hooks, i18n) live at the hud root and are
 * re-exported here too.
 */
export * from './theme';
export * from './primitives';
export * from './pills';
export * from './setup';
export * from './selection';
export * from './overlays';
export * from './system';
export * from './modals';

export { HudLayer, type HudLayerProps } from './HudLayer';

// Cross-cutting helpers (not component buckets — shared infra).
export * from './aria-live-bus';
export * from './captions';
export * from './hotkey-bindings';
export * from './i18n';
export * from './minimap-zoom';
export * from './ui-store';
export * from './usePinchZoom';
export * from './useRafLoop';
