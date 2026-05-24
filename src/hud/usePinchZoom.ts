/**
 * M_FUN.PHONE.PINCH — touch-pinch zoom for the r3f camera.
 *
 * Returns a ref-callback to attach to the Canvas wrapper DIV.
 * Listens for two-finger touch events; computes the delta-distance
 * between fingers each frame; scales the wrapped camera-Y via the
 * passed setter between MIN_ZOOM and MAX_ZOOM. Single-finger
 * touches are passed through to the existing tap/drag handlers.
 *
 * The full PRD §7.9 promise also said "pinch INTO a unit centres
 * + opens its panel" — that requires hit-testing the canvas at
 * pinch-start which is a follow-up. This commit lands the zoom
 * primitive; centre-on-unit ships separately.
 */
import { useEffect, useRef } from 'react';

const MIN_ZOOM = 20;
const MAX_ZOOM = 120;

export interface PinchZoomOptions {
  /** Read the current camera Y so we can apply a relative delta. */
  getCameraY: () => number;
  /** Apply the new camera Y after clamping. */
  setCameraY: (y: number) => void;
}

export function usePinchZoom(opts: PinchZoomOptions) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startDist = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    function dist(t: Touch, u: Touch): number {
      const dx = t.clientX - u.clientX;
      const dy = t.clientY - u.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function onStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      if (!a || !b) return;
      startDist.current = dist(a, b);
      startY.current = opts.getCameraY();
    }
    function onMove(e: TouchEvent) {
      if (e.touches.length !== 2 || startDist.current === null || startY.current === null) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      if (!a || !b) return;
      const d = dist(a, b);
      // Pinch OUT (fingers further apart) → zoom IN → lower Y.
      const ratio = startDist.current / Math.max(1, d);
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startY.current * ratio));
      opts.setCameraY(next);
    }
    function onEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        startDist.current = null;
        startY.current = null;
      }
    }
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: true });
    node.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
    };
  }, [opts]);

  return ref;
}
