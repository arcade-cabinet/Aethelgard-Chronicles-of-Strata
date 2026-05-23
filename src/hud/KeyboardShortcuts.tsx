import { useEffect } from 'react';
import type { GameState } from '@/game/game-state';
import { clearSelection } from '@/game/selection';
import { cameraView } from '@/render/camera-view';

/** M_EXPANSION.F.89 — module-local camera bookmark slots (1..5). */
const cameraBookmarks = new Map<number, { x: number; z: number }>();

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
      // M_EXPANSION.F.89 — camera bookmarks. Shift+1..5 saves the
      // current target; 1..5 alone restores it (delta-pan via the
      // existing pan-camera event). Stored in module-local memory —
      // intentionally not persisted (bookmarks are per-session).
      if (e.key >= '1' && e.key <= '5') {
        const slot = Number(e.key);
        if (e.shiftKey) {
          cameraBookmarks.set(slot, {
            x: cameraView.targetX,
            z: cameraView.targetZ,
          });
        } else {
          const saved = cameraBookmarks.get(slot);
          if (saved) {
            const dx = saved.x - cameraView.targetX;
            const dz = saved.z - cameraView.targetZ;
            window.dispatchEvent(new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }));
          }
        }
        return;
      }
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
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dz = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          window.dispatchEvent(new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }));
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
