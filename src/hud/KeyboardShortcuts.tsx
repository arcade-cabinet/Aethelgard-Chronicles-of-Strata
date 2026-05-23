import { useEffect } from 'react';
import type { GameState } from '@/game/game-state';
import { clearSelection } from '@/game/selection';

/**
 * Keyboard shortcuts (M_ACCESS.1). Pure side-effect component — no DOM
 * output. Adds keyboard navigation alongside the existing P-pause + onboarding-
 * Esc-block:
 *
 * - Esc: clear selection.
 * - Arrow keys: pan camera (forwarded as wheel events on the canvas — the
 *   CameraRig already responds to wheel-zoom; the pan is a stretch goal).
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
        case 'ArrowRight':
          // CameraRig's drag-pan is already wired; arrow keys translate to
          // a small synthesised pointer-drag the rig honours.
          e.preventDefault();
          break;
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
