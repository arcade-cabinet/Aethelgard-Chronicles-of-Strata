/**
 * Minimap zoom state module.
 *
 * Zoom range: 1.0 (full board) … 3.5 (close-up).
 * Default: 1.0.
 *
 * Consumers use subscribeMinimapZoom to react to changes.
 * The Minimap component uses setMinimapZoom from wheel/pinch handlers.
 *
 * M_EXPANSION.U.116
 */

export const MINIMAP_ZOOM_MIN = 1.0;
export const MINIMAP_ZOOM_MAX = 3.5;

let _zoom = MINIMAP_ZOOM_MIN;

const _subscribers = new Set<(zoom: number) => void>();

/** Returns the current minimap zoom level. */
export function getMinimapZoom(): number {
  return _zoom;
}

/**
 * Sets the minimap zoom level, clamped to [MINIMAP_ZOOM_MIN, MINIMAP_ZOOM_MAX].
 * Notifies subscribers only when the clamped value differs from the current.
 */
export function setMinimapZoom(z: number): void {
  const clamped = Math.min(MINIMAP_ZOOM_MAX, Math.max(MINIMAP_ZOOM_MIN, z));
  if (clamped === _zoom) return;
  _zoom = clamped;
  for (const cb of _subscribers) {
    cb(_zoom);
  }
}

/**
 * Subscribe to zoom changes. The callback fires only when the zoom value
 * actually changes (idempotent sets at the clamp boundary do not fire).
 * Returns an unsubscribe function.
 */
export function subscribeMinimapZoom(cb: (zoom: number) => void): () => void {
  _subscribers.add(cb);
  return () => {
    _subscribers.delete(cb);
  };
}

/**
 * Reset zoom to default for test isolation.
 * @internal
 */
export function _resetMinimapZoomForTests(): void {
  _zoom = MINIMAP_ZOOM_MIN;
  _subscribers.clear();
}
