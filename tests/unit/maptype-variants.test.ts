import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';

describe('mapType variants (M_MODES.9)', () => {
  it('archipelago punches LAKE channels through the interior', () => {
    const board = generateBoard('maptype-archipelago', 18, true, 'archipelago');
    let lakes = 0;
    for (const tile of board.tiles.values()) if (tile.type === 'LAKE') lakes += 1;
    // Archipelago paints ~2 wide channels — easily 20+ LAKE tiles vs ~4 for
    // balanced; assert a clear lower bound.
    expect(lakes).toBeGreaterThanOrEqual(15);
  });

  it('dry-land replaces interior GRASS/FOREST/HIGHLAND with DESERT + skips inland lake', () => {
    const board = generateBoard('maptype-dry', 18, true, 'dry-land');
    let desert = 0;
    let lake = 0;
    for (const tile of board.tiles.values()) {
      if (tile.type === 'DESERT') desert += 1;
      if (tile.type === 'LAKE') lake += 1;
    }
    expect(desert).toBeGreaterThan(10);
    expect(lake).toBe(0); // dry-land mapType skips the inland-lake pass
  });

  it('continent keeps the balanced layout (default behavior)', () => {
    const board = generateBoard('maptype-continent', 18, true, 'continent');
    // Continent uses the balanced layout — mountain spine present.
    // M_FUN.MAP.PASS — count MOUNTAIN + MOUNTAIN_PASS (the
    // isthmus pass converts mountain necks to passes; massif
    // footprint is the sum).
    let massif = 0;
    for (const tile of board.tiles.values()) {
      if (tile.type === 'MOUNTAIN' || tile.type === 'MOUNTAIN_PASS') massif += 1;
    }
    expect(massif).toBeGreaterThanOrEqual(3);
  });

  it('mapType is deterministic per seed', () => {
    const a = generateBoard('maptype-determinism', 18, true, 'archipelago');
    const b = generateBoard('maptype-determinism', 18, true, 'archipelago');
    for (const [key, tileA] of a.tiles) {
      const tileB = b.tiles.get(key);
      expect(tileB?.type).toBe(tileA.type);
    }
  });
});
