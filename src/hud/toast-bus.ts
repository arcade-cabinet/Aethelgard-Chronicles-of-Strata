/**
 * toast-bus — the cross-cutting toast event bus (M_V13.HUD.DECYCLE).
 *
 * The `ToastSpec` shape + the `emitToast` dispatcher live here as a
 * hud-root LEAF (alongside aria-live-bus), NOT inside hud/overlays.
 * Reason: `emitToast` is fired by many surfaces (selection, modals,
 * sim systems) — having it in the overlays barrel created import
 * cycles (e.g. modals/DiscoveriesPanel → overlays → TitleScreen →
 * modals). A bus is infra, not an overlay component; emitters import
 * the leaf, and only the <Toasts/> renderer (in hud/overlays) consumes
 * the same type. See docs/specs/21-hud-layout.md for the layer order.
 */

/** One toast in flight. */
export interface ToastSpec {
  /** Optional dedup key; same id replaces. */
  id?: string;
  /** Short headline. */
  title: string;
  /** Optional second line. */
  description?: string;
  /** Visual tone. */
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'critical';
  /** When present, tap-to-zoom into this hex via auto-focus tween. */
  focus?: { q: number; r: number; distance?: number };
  /** Auto-dismiss ms. Default 6000. Critical never auto-dismisses. */
  durationMs?: number;
}

/**
 * Imperative helper — small ergonomic wrapper for code that just wants
 * to fire a toast without dispatching the event manually. The <Toasts/>
 * renderer (hud/overlays) listens for `aethelgard:toast`.
 */
export function emitToast(spec: ToastSpec): void {
  window.dispatchEvent(new CustomEvent('aethelgard:toast', { detail: spec }));
}
