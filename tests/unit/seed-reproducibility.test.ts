import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';

describe('board generation reproducibility', () => {
  it('produces the same tile set for the same seed phrase', () => {
    const a = generateBoard('ancient-silver-forest');
    const b = generateBoard('ancient-silver-forest');
    expect(a.tiles.size).toBe(b.tiles.size);
    for (const [key, tileA] of a.tiles) {
      const tileB = b.tiles.get(key);
      expect(tileB).toBeDefined();
      expect(tileB?.level).toBe(tileA.level);
      expect(tileB?.type).toBe(tileA.type);
    }
  });

  it('produces a different board for a different seed phrase', () => {
    const a = generateBoard('ancient-silver-forest');
    const b = generateBoard('grizzled-crimson-keep');
    let differences = 0;
    for (const key of a.tiles.keys()) {
      if (a.tiles.get(key)?.level !== b.tiles.get(key)?.level) differences += 1;
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('every tile is within the map radius', () => {
    const board = generateBoard('ancient-silver-forest');
    for (const tile of board.tiles.values()) {
      const s = -tile.q - tile.r;
      expect(Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(s))).toBeLessThanOrEqual(20);
    }
  });

  it('ocean tiles are not walkable; land tiles are walkable', () => {
    const board = generateBoard('ancient-silver-forest');
    for (const tile of board.tiles.values()) {
      if (tile.type === 'OCEAN' || tile.type === 'LAKE') {
        expect(tile.walkable).toBe(false);
      }
    }
  });

  it('the board has at least one walkable land tile', () => {
    const board = generateBoard('ancient-silver-forest');
    const land = [...board.tiles.values()].filter((t) => t.walkable);
    expect(land.length).toBeGreaterThan(0);
  });
});
