import type { Entity } from 'koota';
import { useEffect, useRef, useState } from 'react';
import type { Camera } from 'three';
import { Vector3 } from 'three';
import { FactionTrait, Transform, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { clearSelection, selectEntities } from '@/game/selection';

/** Screen-pixel rectangle. */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A drag is "real" only beyond this many pixels — guards against jittery clicks. */
const MIN_DRAG_PX = 6;

/**
 * Click-drag multi-unit selection (M_GAMEPLAY.2). Listens on the document for
 * pointerdown/move/up; on a real drag (≥6px) renders a translucent rectangle
 * overlay, and on release projects every player unit's world position into
 * screen space and selects those whose projection falls inside the rect.
 *
 * Mounted as a sibling of the GameCanvas; the rect overlay is pointer-events-
 * none so it never blocks normal taps. A non-drag click (small movement)
 * falls through to TileInteraction's existing tap-to-select.
 */
export function SelectionRect({
  game,
  getCamera,
}: {
  game: GameState;
  getCamera: () => Camera | null;
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  // Ref mirror so onUp always reads the latest rect without being listed
  // in the useEffect dependency array (which would re-register all listeners
  // on every pointermove frame).
  const rectRef = useRef<Rect | null>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // ignore right/middle button + clicks inside HUD panels
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-hud-panel]')) return;
      startRef.current = { x: e.clientX, y: e.clientY };
    };
    // M_AUDIT2.SEC2.25 — throttle pointermove to rAF. On a 1000Hz
    // gaming mouse this fires 1000× per second; without coalescing
    // we'd recompute the rect + call setRect on every event, churning
    // React reconcile. rAF gives natural 60Hz coalescing.
    let pendingEvent: PointerEvent | null = null;
    let rafId = 0;
    const onMove = (e: PointerEvent) => {
      pendingEvent = e;
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const ev = pendingEvent;
        pendingEvent = null;
        if (!ev) return;
        const start = startRef.current;
        if (!start) return;
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        if (Math.abs(dx) < MIN_DRAG_PX && Math.abs(dy) < MIN_DRAG_PX) return;
        const next = {
          x: Math.min(start.x, ev.clientX),
          y: Math.min(start.y, ev.clientY),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
        rectRef.current = next;
        setRect(next);
      });
    };
    const onUp = () => {
      const start = startRef.current;
      const r = rectRef.current;
      startRef.current = null;
      rectRef.current = null;
      setRect(null);
      if (!start || !r || r.w < MIN_DRAG_PX || r.h < MIN_DRAG_PX) return;
      // a real drag — select every player unit inside the rect
      const cam = getCamera();
      if (!cam) return;
      const selected: Entity[] = [];
      const v = new Vector3();
      for (const e of game.world.query(Unit, FactionTrait, Transform)) {
        if (e.get(FactionTrait)?.faction !== 'player') continue;
        const tf = e.get(Transform);
        if (!tf) continue;
        v.set(tf.x, tf.y, tf.z).project(cam);
        // NDC → CSS pixel (clip range [-1,1] → [0, viewport.x|y])
        const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
        if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) {
          selected.push(e);
        }
      }
      if (selected.length > 0) selectEntities(game, selected);
      else clearSelection(game);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      // M_AUDIT2.SEC2.25 — cancel any pending rAF so the throttled
      // setRect doesn't fire post-unmount.
      if (rafId !== 0) cancelAnimationFrame(rafId);
      // M_AUDIT2.UX.36 — clear in-flight drag state so a remount
      // (HMR, route change) doesn't inherit a half-finished drag.
      startRef.current = null;
      rectRef.current = null;
      setRect(null);
    };
  }, [game, getCamera]);

  if (!rect) return null;
  return (
    <div
      id="selection-rect"
      style={{
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        border: '1px solid #38bdf8',
        background: 'rgba(56, 189, 248, 0.12)',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
