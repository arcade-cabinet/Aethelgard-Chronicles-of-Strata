import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';

describe('M_MAPGEN guarantees', () => {
  it('M_MAPGEN.4 — beach ring + ocean perimeter', () => {
    const board = generateBoard('mapgen-test-1', 18);
    for (const tile of board.tiles.values()) {
      const d = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
      if (d > board.radius - 2) {
        expect(tile.type).toBe('OCEAN');
      }
    }
  });

  it('M_MAPGEN.3 — mountain spine creates funneling (≥3 MOUNTAIN tiles in central band)', () => {
    const board = generateBoard('mapgen-test-2', 18);
    let mountainCount = 0;
    for (const tile of board.tiles.values()) {
      const d = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
      if (d > 6) continue; // central band
      if (tile.type === 'MOUNTAIN') mountainCount += 1;
    }
    expect(mountainCount).toBeGreaterThanOrEqual(3);
  });

  it('M_MAPGEN.5 — guaranteed inland LAKE cluster (≥4 LAKE tiles)', () => {
    const board = generateBoard('mapgen-test-3', 18);
    let lake = 0;
    for (const tile of board.tiles.values()) if (tile.type === 'LAKE') lake += 1;
    expect(lake).toBeGreaterThanOrEqual(4);
  });

  it('M_MAPGEN.6 — ≥4 distinct elevation tiers present', () => {
    const board = generateBoard('mapgen-test-4', 18);
    const levels = new Set<number>();
    for (const tile of board.tiles.values()) levels.add(tile.level);
    expect(levels.size).toBeGreaterThanOrEqual(4);
  });

  it('M_MAPGEN — deterministic: same seed → same biome layout', () => {
    const a = generateBoard('mapgen-determinism', 18);
    const b = generateBoard('mapgen-determinism', 18);
    for (const [key, tileA] of a.tiles) {
      const tileB = b.tiles.get(key);
      expect(tileB?.type).toBe(tileA.type);
      expect(tileB?.level).toBe(tileA.level);
    }
  });
});
