import { useEffect } from 'react';
import type { GameState } from '@/game/game-state';
import { clearSelection } from '@/game/selection';

/**
 * Keyboard shortcuts (M_ACCESS.1). Pure side-effect component — no DOM
 * output. Adds keyboard navigation alongside the existing P-pause + onboarding-
 * Esc-block:
 *
 * - Esc: clear selection.
 * - Arrow keys: pan camera (dispatches 'aethelgard:pan-camera'; CameraRig
 *   translates the controls target + camera by the {dx,dz} step. Shift = 4× speed.)
 * - + / -: zoom (wheel events on the canvas).
 *
 * The pause toggle (P) is owned by PauseControl. Tab cycling between HUD
 * buttons is the browser default and works out of the box.
 */
export function KeyboardShortcuts({ game }: { game: GameState }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore inputs
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      switch (e.key) {
        case 'Escape':
          clearSelection(game);
          break;
        case '+':
        case '=':
          // synthesise a wheel-up to leverage CameraRig's zoom logic
          dispatchWheel(-100);
          break;
        case '-':
        case '_':
          dispatchWheel(100);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          // M_AUDIT2.UX.31 — emit a pan-camera CustomEvent the
          // CameraRig listens for. Step size is ~1 hex per press
          // (HEX_RADIUS ≈ 1.0); shift-arrow steps 4× faster. Note:
          // CameraRig clamps to board extents so off-edge presses
          // become no-ops without us having to know the radius here.
          e.preventDefault();
          const step = e.shiftKey ? 4 : 1;
          const dx =
            e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dz =
            e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          window.dispatchEvent(
            new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }),
          );
          break;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [game]);

  return null;
}

/** Synthesise a wheel event on the game canvas so the camera zooms. */
function dispatchWheel(deltaY: number) {
  const canvas = document.querySelector('canvas:not(#minimap-canvas)') as HTMLElement | null;
  if (!canvas) return;
  canvas.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true }));
}
