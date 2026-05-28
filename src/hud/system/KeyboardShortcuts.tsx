import { type Entity, unpackEntity } from 'koota';
import { useEffect } from 'react';
import { type BuildingType, Selectable } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { clearSelection, selectEntities } from '@/game/selection';
import { cameraView } from '@/render/camera-view';
import { BUILDING_ACTION, getBinding, type HotkeyAction } from '../hotkey-bindings';

/**
 * M_EXPANSION.U.115 — build-hotkey lookup is derived from the
 * user-remappable bindings table rather than hard-coded. The
 * defaults are:
 *
 *   f = Farm, h = House, g = Granary, r = Barracks (Recruit),
 *   t = Watchtower, w = Wall, b = build-menu, Escape = clear selection
 *
 * Resolved through `getBinding(action)` at lookup time, so a remap
 * applied via the SettingsModal takes effect on the next keypress
 * without a reload.
 */
function buildHotkeyForKey(key: string): BuildingType | null {
  for (const [bt, action] of Object.entries(BUILDING_ACTION) as Array<
    [BuildingType, HotkeyAction]
  >) {
    if (getBinding(action) === key) return bt;
  }
  return null;
}

/** M_EXPANSION.F.89 — module-local camera bookmark slots (1..5). */
const cameraBookmarks = new Map<number, { x: number; z: number }>();

/** M_EXPANSION.F.91 — module-local selection group slots (1..5). */
const selectionGroups = new Map<number, number[]>();

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
      // M_EXPANSION.F.89 + F.91 — number-row bindings:
      //   1..5             camera bookmark recall
      //   Shift+1..5       camera bookmark save
      //   Ctrl/Meta+1..5   selection group save
      //   Alt+1..5         selection group recall
      if (e.key >= '1' && e.key <= '5') {
        const slot = Number(e.key);
        if (e.ctrlKey || e.metaKey) {
          selectionGroups.set(slot, (game.selectedIds ?? []).slice());
          return;
        }
        if (e.altKey) {
          const ids = selectionGroups.get(slot);
          if (ids && ids.length > 0) {
            const entities: Entity[] = [];
            for (const ent of game.world.query(Selectable)) {
              if (ids.includes(unpackEntity(ent).entityId)) entities.push(ent);
            }
            selectEntities(game, entities);
          }
          return;
        }
        if (e.shiftKey) {
          cameraBookmarks.set(slot, { x: cameraView.targetX, z: cameraView.targetZ });
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
      // M_EXPANSION.U.115 — resolve to actions via the bindings table
      // so remapped keys take effect on the next keypress.
      const clearKey = getBinding('select.clear');
      const zoomInKey = getBinding('camera.zoom-in');
      const zoomOutKey = getBinding('camera.zoom-out');
      if (e.key === clearKey) {
        clearSelection(game);
        return;
      }
      if (e.key === zoomInKey || e.key === '=') {
        dispatchWheel(-100);
        return;
      }
      if (e.key === zoomOutKey || e.key === '_') {
        dispatchWheel(100);
        return;
      }
      switch (e.key) {
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
          // M_SIMPLIFY.6 — flat lookup replaces the prior nested
          // ternaries `dx = key === 'ArrowLeft' ? -step : key ===
          // 'ArrowRight' ? step : 0`. One ARROW_VECTORS row per
          // direction; signs are scaled by `step` per press.
          const ARROW_VECTORS: Record<string, [number, number]> = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          };
          const v = ARROW_VECTORS[e.key];
          if (!v) break;
          const dx = v[0] * step;
          const dz = v[1] * step;
          window.dispatchEvent(new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }));
          break;
        }
        // M_SIMPLIFY.1 — replaced 7 parallel switch cases with one
        // data-table lookup. The map below is the contract for which
        // letter picks which building; adding a new building type =
        // one new map entry, not two new case lines.
      }
      // M_EXPANSION.U.118 + U.115 — bindings-table build hotkeys.
      // Keys land lowercased so a binding stored as 'F' still fires;
      // the user is more likely to type lower-case but we tolerate
      // either side.
      const lower = e.key.toLowerCase();
      if (lower === getBinding('build.menu')) {
        window.dispatchEvent(new CustomEvent('aethelgard:open-build-menu'));
        return;
      }
      const buildType = buildHotkeyForKey(lower);
      if (buildType) {
        window.dispatchEvent(
          new CustomEvent('aethelgard:trigger-build', { detail: { type: buildType } }),
        );
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
