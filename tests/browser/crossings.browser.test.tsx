/**
 * Crossings render — browser test (M8.0, spec 99).
 *
 * Verifies:
 * 1. The game mounts with the Crossings component inside a real r3f Canvas.
 * 2. A seeded board produces crossings, each with a valid form + biome style.
 * 3. Every crossing's style matches `biomeStyleFor` of its higher tile.
 * 4. Crossings are sparse — far fewer than the candidate cliff edges.
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { HEX_DIRECTIONS } from '@/config/world';
import { biomeStyleFor } from '@/core/biome';
import { generateBoard } from '@/core/board';
import { crossingKey } from '@/core/crossings';
import { getHexKey } from '@/core/hex';
import { enterGame } from './enter-game';

describe('Crossings render', () => {
  it('mounts the game with the crossings layer', async () => {
    await render(<App />);
    await enterGame();
    const canvas = document.querySelector('canvas:not(#minimap-canvas)');
    expect(canvas).not.toBeNull();
  });

  it('a seeded board has crossings with valid form + biome style', () => {
    const board = generateBoard('ancient-silver-forest');
    expect(board.crossings.size).toBeGreaterThan(0);
    for (const c of board.crossings.values()) {
      expect(c.form === 'natural' || c.form === 'artificial').toBe(true);
      const high = board.tiles.get(c.highKey);
      expect(c.style).toBe(biomeStyleFor(high?.type ?? 'GRASS'));
    }
  });

  it('places crossings sparsely vs candidate cliff edges', () => {
    const board = generateBoard('ancient-silver-forest');
    let candidates = 0;
    const seen = new Set<string>();
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      for (const dir of HEX_DIRECTIONS) {
        const nKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
        const n = board.tiles.get(nKey);
        if (!n || !n.walkable || Math.abs(n.level - tile.level) !== 1) continue;
        const edge = crossingKey(getHexKey(tile.q, tile.r), nKey);
        if (!seen.has(edge)) {
          seen.add(edge);
          candidates += 1;
        }
      }
    }
    expect(board.crossings.size).toBeLessThan(candidates * 0.5);
  });
});
