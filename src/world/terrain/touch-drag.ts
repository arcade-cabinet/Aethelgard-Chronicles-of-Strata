/**
 * M_EXPANSION.U.119 — tap-and-hold drag scroll on touch.
 *
 * Pure-state helper with no DOM coupling so it can be unit-tested in Node.
 * TileInteraction installs the DOM handlers; this module owns the state
 * machine and the pixel→world-space conversion.
 *
 * State machine:
 *   idle  ──[startDrag()]──▶  dragging  ──[stopDrag()]──▶  idle
 *
 * computePanDelta() is valid at any time but only emits non-zero when dragging.
 */

/** Internal drag state. */
interface DragState {
  active: boolean;
  lastX: number;
  lastY: number;
}

const state: DragState = { active: false, lastX: 0, lastY: 0 };

/**
 * Enter drag mode. Call this when the long-press threshold fires.
 * Records the first pointer position so the next computePanDelta() has
 * a baseline.
 */
export function startDrag(clientX: number, clientY: number): void {
  state.active = true;
  state.lastX = clientX;
  state.lastY = clientY;
}

/**
 * Exit drag mode. Call on pointerup or pointercancel.
 */
export function stopDrag(): void {
  state.active = false;
}

/**
 * Returns true when a drag is currently in progress.
 */
export function isDragging(): boolean {
  return state.active;
}

/**
 * Convert a pointermove event position into a world-space pan delta
 * {dx, dz} and update the internal last-position baseline.
 *
 * The scale factor maps screen pixels to world units proportionally to
 * the current camera distance (zoom). The magic constant 0.005 is
 * calibrated so at the default distance (~60 units) a 1-pixel swipe moves
 * roughly 0.3 world units — perceptually about one hex step per 5 pixels,
 * which feels natural on a Pixel-5a at 72dpi.
 *
 * Returns {dx: 0, dz: 0} when not dragging.
 */
export function computePanDelta(
  clientX: number,
  clientY: number,
  cameraDistance: number,
): { dx: number; dz: number } {
  if (!state.active) return { dx: 0, dz: 0 };

  const pixelDx = clientX - state.lastX;
  const pixelDy = clientY - state.lastY;

  state.lastX = clientX;
  state.lastY = clientY;

  // Scale: more zoomed out → larger world step per pixel.
  // Negate X so dragging right pans the camera left (world moves right).
  // pixelDy maps to world-Z (screen-Y is forward/back in an RTS camera).
  const scale = cameraDistance * 0.005;
  return {
    dx: -pixelDx * scale,
    dz: -pixelDy * scale,
  };
}

/**
 * Reset state to idle — used by tests between cases.
 * Not needed in production code because stopDrag() covers all cases.
 */
export function _resetForTest(): void {
  state.active = false;
  state.lastX = 0;
  state.lastY = 0;
}
