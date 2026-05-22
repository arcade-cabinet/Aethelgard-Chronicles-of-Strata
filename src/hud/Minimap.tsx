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

/**
 * A 2D top-down minimap. Each frame it draws the terrain (every tile a
 * biome-colored pixel) then plots unit dots (green player, red enemy) and the
 * Town Hall / Goblin Portal markers, reading positions live from the ECS.
 */
export function Minimap({ game }: { game: GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawMinimap(ctx, game);
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

/** Draw the full minimap — terrain, then the live unit/building overlay. */
function drawMinimap(ctx: CanvasRenderingContext2D, game: GameState): void {
  // terrain
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const dot = Math.max(2, SIZE / (MAP_RADIUS * 2 + 1));
  for (const tile of game.board.tiles.values()) {
    const { x, y } = project(tile.q, tile.r);
    ctx.fillStyle = BIOME_COLORS[tile.type];
    ctx.fillRect(x - dot / 2, y - dot / 2, dot, dot);
  }
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
