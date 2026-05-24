/**
 * M_EXPANSION.F.83 — map preview thumbnail.
 *
 * Generates the seeded board offline and draws it onto a 2D canvas
 * using the same per-biome palette the minimap uses. Lets the
 * player visually preview what map they're about to play before
 * clicking Begin. ~256×256 by default.
 *
 * Cheap: generateBoard is synchronous and small (≤2000 tiles even
 * at Huge). We don't render any trees / structures / characters —
 * just the colored hex centers. ~5ms per preview generation.
 */
import { useEffect, useRef } from 'react';
import { generateBoard } from '@/core/board';
import { BIOME_COLORS } from '@/world/palette';

export interface MapPreviewProps {
  seedPhrase: string;
  mapRadius: number;
  /** Pixel dimension (square). Defaults to 240. */
  size?: number;
}

export function MapPreview({ seedPhrase, mapRadius, size = 240 }: MapPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let cancelled = false;
    // Defer the heavy generation to next frame so the modal mount
    // isn't blocked.
    const id = window.setTimeout(() => {
      if (cancelled) return;
      const board = generateBoard(seedPhrase, mapRadius, true);
      ctx.fillStyle = '#0b0f17';
      ctx.fillRect(0, 0, size, size);

      // Pixel size per tile — fit the whole hex grid into the
      // preview. board.radius is hex tiles; world span is roughly
      // 2 × radius × HEX_RADIUS. Pick px/tile so all tiles fit.
      const span = mapRadius * 2 + 2;
      const tilePx = size / span;
      const cx = size / 2;
      const cy = size / 2;
      // Axial-to-screen: standard hex projection. The minimap uses
      // the same approach; we don't need pixel-perfect alignment
      // since the preview is a "vibe check" not a navigation tool.
      const HEX_W = tilePx * Math.sqrt(3);
      const HEX_H = tilePx * 1.5;
      for (const tile of board.tiles.values()) {
        const x = cx + (tile.q + tile.r / 2) * HEX_W * 0.5;
        const y = cy + tile.r * HEX_H * 0.5;
        ctx.fillStyle = BIOME_COLORS[tile.type] ?? '#444';
        ctx.fillRect(x - tilePx / 2, y - tilePx / 2, tilePx, tilePx);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [seedPhrase, mapRadius, size]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Map preview"
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: '#0b0f17',
      }}
    />
  );
}
