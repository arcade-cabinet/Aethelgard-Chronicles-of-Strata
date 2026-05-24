import { useEffect, useRef, useState } from 'react';
import { HEX_RADIUS } from '@/config/world';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { getMinimapZoom, setMinimapZoom, subscribeMinimapZoom } from '@/hud/minimap-zoom';
import { cameraView } from '@/render/camera-view';
import { SKINS } from '@/rules/skins';
import { BIOME_COLORS } from '@/world/palette';

/** Minimap canvas size in pixels. */
const SIZE = 140;

/** Project an axial (q, r) into minimap pixel coordinates for a board radius. */
function projectAxial(q: number, r: number, radius: number): { x: number; y: number } {
  const span = radius * 2 + 1;
  return {
    x: SIZE / 2 + ((q + r / 2) / span) * SIZE,
    y: SIZE / 2 + (r / span) * SIZE,
  };
}

/**
 * Project a world XZ position into minimap pixel coordinates. The board spans
 * roughly `±radius * HEX_RADIUS * 1.8` in world units; that range maps to the
 * minimap's pixel extent.
 */
function projectWorld(wx: number, wz: number, radius: number): { x: number; y: number } {
  const worldSpan = radius * HEX_RADIUS * 1.8 * 2;
  return {
    x: SIZE / 2 + (wx / worldSpan) * SIZE,
    y: SIZE / 2 + (wz / worldSpan) * SIZE,
  };
}

/** Render the static terrain layer once onto an offscreen canvas. */
function renderTerrain(game: GameState): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const ctx = off.getContext('2d');
  if (ctx) {
    const radius = game.board.radius;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const dot = Math.max(2, SIZE / (radius * 2 + 1));
    for (const tile of game.board.tiles.values()) {
      const { x, y } = projectAxial(tile.q, tile.r, radius);
      ctx.fillStyle = BIOME_COLORS[tile.type];
      ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
    }
  }
  return off;
}

/**
 * A 2D top-down minimap. The terrain — which never changes after `startGame` —
 * is rasterized once to an offscreen canvas; each frame blits that cached layer
 * then draws the live overlay: unit dots, the Town Hall / Portal markers, and a
 * rectangle showing the slice of the board the camera is currently framing.
 *
 * M_EXPANSION.U.116 — zoom support: wheel and pinch adjust zoom 1.0..3.5.
 * At zoom > 1 the visible viewport centers on the camera target.
 * Click → world coord math accounts for the zoom + offset.
 */
export function Minimap({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mirror zoom into React state so layout re-renders on change (e.g. cursor
  // indicator). The actual zoom value is read from the module in drawOverlay.
  const [zoom, setZoom] = useState(getMinimapZoom);

  // ── zoom subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    return subscribeMinimapZoom((z) => setZoom(z));
  }, []);

  // ── non-passive wheel listener (React's onWheel is passive) ──────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // deltaY > 0 → scroll down → zoom out; deltaY < 0 → zoom in.
      const STEP = 0.25;
      setMinimapZoom(getMinimapZoom() + (e.deltaY > 0 ? -STEP : STEP));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // ── pinch-to-zoom (track two pointers, compute distance ratio) ───────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    type PtrPos = { x: number; y: number };
    const pointers = new Map<number, PtrPos>();
    let lastPinchDist = 0;
    let pinchStartZoom = getMinimapZoom();

    const pinchDist = (): number => {
      const vals = [...pointers.values()];
      const pa = vals[0];
      const pb = vals[1];
      if (!pa || !pb) return 0;
      return Math.hypot(pb.x - pa.x, pb.y - pa.y);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        lastPinchDist = pinchDist();
        pinchStartZoom = getMinimapZoom();
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const dist = pinchDist();
        if (lastPinchDist > 0) {
          setMinimapZoom(pinchStartZoom * (dist / lastPinchDist));
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      lastPinchDist = 0;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  // ── render loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const terrain = renderTerrain(game);
    // M_MICRO.5.5 — throttle full-overlay redraw to ~10Hz. The minimap
    // doesn't need 60Hz precision — unit dots move ~2 tiles/sec, and
    // the camera-frustum rect is a coarse hint. ~100ms accumulator
    // cuts canvas work by 6x at no perceptual cost.
    const FRAME_INTERVAL_MS = 100;
    let raf = 0;
    let lastDraw = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - lastDraw < FRAME_INTERVAL_MS) return;
      lastDraw = t;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawOverlay(ctx, terrain, game);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // the canvas keeps its internal SIZE resolution (projection math is stable);
  // only the on-screen CSS size shrinks on narrow viewports.
  const displaySize = compact ? 96 : SIZE;

  return (
    <section
      aria-label="Minimap"
      style={{
        position: 'absolute',
        // M_POLISH2.MOBILE.3 — portrait moves the minimap from
        // bottom-right (where the BuildMenuButton FAB lives) to
        // top-right below the MobileSpeedPausePill (top:8 spans
        // ~44px tall, so minimap sits at top:60). Desktop keeps
        // bottom-right.
        ...(compact ? { top: 'calc(env(safe-area-inset-top, 0px) + 60px)' } : { bottom: 16 }),
        right: compact ? 8 : 16,
        width: displaySize,
        height: displaySize,
        borderRadius: 12,
        overflow: 'hidden',
        border: '2px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        // Subtle ring when zoomed so the player knows they're in zoom mode.
        outline: zoom > 1.0 ? '2px solid rgba(56, 189, 248, 0.7)' : undefined,
      }}
    >
      <canvas
        ref={canvasRef}
        id="minimap-canvas"
        width={SIZE}
        height={SIZE}
        // M_EXPANSION.F.90 — click-to-pan, updated for M_EXPANSION.U.116 zoom.
        // Under zoom the canvas is offset so the camera target is centered.
        // The inverse mapping must undo both the zoom scale and the offset.
        onClick={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          // Click position in canvas-internal pixels (before CSS scaling).
          const cx = ((e.clientX - rect.left) / rect.width) * SIZE;
          const cy = ((e.clientY - rect.top) / rect.height) * SIZE;

          const z = getMinimapZoom();
          const worldSpan = game.board.radius * HEX_RADIUS * 1.8 * 2;

          if (z > 1.0) {
            // Compute the offset applied during drawOverlay zoom.
            // Camera target in unzoomed canvas-px:
            const { x: tx, y: ty } = projectWorld(
              cameraView.targetX,
              cameraView.targetZ,
              game.board.radius,
            );
            // Offset applied: translate(SIZE/2 - tx*z, SIZE/2 - ty*z)
            // Inverse: unzoomed_px = (cx - offsetX) / z + (SIZE/2 - SIZE/2/z)
            // Simplification: unzoomed = (cx - (SIZE/2 - tx*z)) / z → wrong.
            // Correct: after transform the drawn point at (px, py) lands at
            //   (px - tx)*z + SIZE/2, (py - ty)*z + SIZE/2
            // So: px = (cx - SIZE/2) / z + tx
            const pxInUnzoomed = (cx - SIZE / 2) / z + tx;
            const pyInUnzoomed = (cy - SIZE / 2) / z + ty;
            // Inverse of projectWorld: (px - SIZE/2) / SIZE * worldSpan = wx
            const wx = ((pxInUnzoomed - SIZE / 2) / SIZE) * worldSpan;
            const wz = ((pyInUnzoomed - SIZE / 2) / SIZE) * worldSpan;
            const dx = wx - cameraView.targetX;
            const dz = wz - cameraView.targetZ;
            window.dispatchEvent(new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }));
          } else {
            // No zoom — original mapping.
            const wx = ((cx - SIZE / 2) / SIZE) * worldSpan;
            const wz = ((cy - SIZE / 2) / SIZE) * worldSpan;
            const dx = wx - cameraView.targetX;
            const dz = wz - cameraView.targetZ;
            window.dispatchEvent(new CustomEvent('aethelgard:pan-camera', { detail: { dx, dz } }));
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated',
          cursor: zoom > 1.0 ? 'zoom-in' : 'crosshair',
          pointerEvents: 'auto',
        }}
      />
    </section>
  );
}

/** Blit the cached terrain, then draw the live overlay.
 *
 * M_EXPANSION.U.116 — when zoom > 1, apply a canvas transform that scales
 * around the camera target's minimap pixel position, keeping it centered.
 * All subsequent draw calls (terrain, dots, markers, viewport rect) land in
 * the zoomed coordinate space. We save/restore around the whole draw so the
 * next frame starts clean.
 */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  terrain: HTMLCanvasElement,
  game: GameState,
): void {
  const radius = game.board.radius;
  const zoom = getMinimapZoom();

  ctx.save();

  if (zoom > 1.0) {
    // Camera target in unzoomed canvas-px.
    const { x: tx, y: ty } = projectWorld(cameraView.targetX, cameraView.targetZ, radius);
    // Translate so that (tx, ty) stays at the canvas centre when zoomed.
    // Transform: translate(SIZE/2, SIZE/2) · scale(z) · translate(-tx, -ty)
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-tx, -ty);
  }

  ctx.drawImage(terrain, 0, 0);

  // unit dots
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const { x, y } = projectAxial(hex.q, hex.r, radius);
    // M_REGISTRY.27 — minimap.unitColor lives on the Skin slot per
    // faction; no more `=== 'enemy' ? ...` hand-branch.
    const fac = e.get(FactionTrait)?.faction ?? 'player';
    ctx.fillStyle = SKINS[fac].minimap.unitColor;
    // M_AUDIT2.UX.34 — dot drawn at 4 internal-px so the compact (96px
    // CSS) viewport keeps unit dots visible at ≥2.7 device-px instead
    // of nearly-invisible 2.06px from the prior 3 internal-px.
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }

  // home base + enemy base markers — colors live on each faction's
  // Skin (M_REGISTRY.27). Adding a third tribe's base marker = ONE
  // Skin row, no Minimap edit.
  for (const [entity, color] of [
    [game.townHallEntity, SKINS.player.minimap.baseColor],
    [game.enemyBaseEntity, SKINS.enemy.minimap.baseColor],
  ] as const) {
    const hex = entity.get(HexPosition);
    if (!hex) continue;
    const { x, y } = projectAxial(hex.q, hex.r, radius);
    ctx.fillStyle = color;
    ctx.beginPath();
    // M_AUDIT2.UX.34 — base marker at 5 internal-px stays visible at
    // ≥3.4 device-px on the compact 96-px display.
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // camera viewport rectangle — the slice of the board currently on screen.
  // The on-screen extent scales with camera distance (closer = smaller box).
  const { x: cx, y: cy } = projectWorld(cameraView.targetX, cameraView.targetZ, radius);
  const boxSpan = (cameraView.distance / (radius * HEX_RADIUS * 1.8 * 2)) * SIZE;
  const half = Math.max(6, Math.min(SIZE, boxSpan)) / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  // Scale viewport rect line width inversely with zoom so it stays visually thin.
  ctx.lineWidth = 1.5 / zoom;
  ctx.strokeRect(cx - half, cy - half * 0.7, half * 2, half * 1.4);

  ctx.restore();
}
