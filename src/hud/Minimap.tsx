import { useEffect, useRef } from 'react';
import { HEX_RADIUS } from '@/config/world';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { cameraView } from '@/render/camera-view';
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
 */
export function Minimap({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const terrain = renderTerrain(game);
    let raf = 0;
    const tick = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawOverlay(ctx, terrain, game);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // the canvas keeps its internal SIZE resolution (projection math is stable);
  // only the on-screen CSS size shrinks on narrow viewports.
  const displaySize = compact ? 96 : SIZE;

  return (
    <div
      role="region"
      aria-label="Minimap"
      style={{
        position: 'absolute',
        bottom: compact ? 8 : 16,
        right: compact ? 8 : 16,
        width: displaySize,
        height: displaySize,
        borderRadius: 12,
        overflow: 'hidden',
        border: '2px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      }}
    >
      <canvas
        ref={canvasRef}
        id="minimap-canvas"
        width={SIZE}
        height={SIZE}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
      />
    </div>
  );
}

/** Blit the cached terrain, then draw the live overlay. */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  terrain: HTMLCanvasElement,
  game: GameState,
): void {
  const radius = game.board.radius;
  ctx.drawImage(terrain, 0, 0);

  // unit dots
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const { x, y } = projectAxial(hex.q, hex.r, radius);
    ctx.fillStyle = e.get(FactionTrait)?.faction === 'enemy' ? '#ef4444' : '#22c55e';
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }

  // home base + enemy base markers
  for (const [entity, color] of [
    [game.townHallEntity, '#38bdf8'],
    [game.enemyBaseEntity, '#a855f7'],
  ] as const) {
    const hex = entity.get(HexPosition);
    if (!hex) continue;
    const { x, y } = projectAxial(hex.q, hex.r, radius);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // camera viewport rectangle — the slice of the board currently on screen.
  // The on-screen extent scales with camera distance (closer = smaller box).
  const { x: cx, y: cy } = projectWorld(cameraView.targetX, cameraView.targetZ, radius);
  const boxSpan = (cameraView.distance / (radius * HEX_RADIUS * 1.8 * 2)) * SIZE;
  const half = Math.max(6, Math.min(SIZE, boxSpan)) / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - half, cy - half * 0.7, half * 2, half * 1.4);
}
