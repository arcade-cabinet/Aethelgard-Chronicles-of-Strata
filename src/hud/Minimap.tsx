import { useEffect, useRef } from 'react';
import { MAP_RADIUS } from '@/core/constants';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { BIOME_COLORS } from '@/world/palette';

/** Minimap canvas size in pixels. */
const SIZE = 140;

/** Project an axial (q, r) into minimap pixel coordinates. */
function project(q: number, r: number): { x: number; y: number } {
  const span = MAP_RADIUS * 2 + 1;
  const px = SIZE / 2 + ((q + r / 2) / span) * SIZE;
  const py = SIZE / 2 + (r / span) * SIZE;
  return { x: px, y: py };
}

/** Render the static terrain layer once onto an offscreen canvas. */
function renderTerrain(game: GameState): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const ctx = off.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const dot = Math.max(2, SIZE / (MAP_RADIUS * 2 + 1));
    for (const tile of game.board.tiles.values()) {
      const { x, y } = project(tile.q, tile.r);
      ctx.fillStyle = BIOME_COLORS[tile.type];
      ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
    }
  }
  return off;
}

/**
 * A 2D top-down minimap. The terrain — which never changes after `startGame` —
 * is rasterized once to an offscreen canvas; each frame blits that cached layer
 * then draws only the live overlay (unit dots, Town Hall, Portal). This keeps
 * per-frame cost to O(units) rather than O(tiles).
 */
export function Minimap({ game }: { game: GameState }) {
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

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: SIZE,
        height: SIZE,
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

/** Blit the cached terrain, then draw the live unit/building overlay. */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  terrain: HTMLCanvasElement,
  game: GameState,
): void {
  ctx.drawImage(terrain, 0, 0);
  // unit dots
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const { x, y } = project(hex.q, hex.r);
    ctx.fillStyle = e.get(FactionTrait)?.faction === 'enemy' ? '#ef4444' : '#22c55e';
    ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  // Town Hall marker
  const th = game.townHallEntity.get(HexPosition);
  if (th) {
    const { x, y } = project(th.q, th.r);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Goblin Portal marker
  const portal = game.portalEntity.get(HexPosition);
  if (portal) {
    const { x, y } = project(portal.q, portal.r);
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
