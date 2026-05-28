import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { Minimap } from '@/hud/system';

describe('Minimap', () => {
  it('draws the board — the canvas has non-empty pixel data', async () => {
    const game = startGame('ancient-silver-forest');
    render(<Minimap game={game} />);
    await vi.waitFor(
      () => {
        const canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement | null;
        expect(canvas).not.toBeNull();
        const ctx = canvas?.getContext('2d');
        const data = ctx?.getImageData(0, 0, canvas?.width ?? 0, canvas?.height ?? 0).data;
        // at least one pixel is a non-background biome color
        let painted = false;
        if (data) {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] ?? 0;
            const g = data[i + 1] ?? 0;
            const b = data[i + 2] ?? 0;
            // background is #090d16 — anything brighter is a drawn tile
            if (r + g + b > 80) {
              painted = true;
              break;
            }
          }
        }
        expect(painted).toBe(true);
      },
      { timeout: 5000, interval: 150 },
    );
  });
});
