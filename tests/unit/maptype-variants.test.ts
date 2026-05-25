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

  it('continent has denser mountains than archipelago at the same seed (intensity contract)', () => {
    // Coderabbit MAJOR fix: the prior `>= 3` assertion was too
    // permissive — any board with three MOUNTAIN tiles passed,
    // regardless of intensity. Compare the SAME seed across two
    // mapTypes (continent intensity 0.7 vs archipelago intensity
    // 0.25) and assert continent has materially more mountain
    // tiles. This catches an intensity-regression where the
    // mapgen.json `mountainIntensity` tuner gets accidentally
    // flattened across modes.
    const continent = generateBoard('maptype-intensity', 28, true, 'continent');
    const archipelago = generateBoard('maptype-intensity', 28, true, 'archipelago');
    const massif = (board: typeof continent) => {
      let n = 0;
      for (const tile of board.tiles.values()) {
        if (tile.type === 'MOUNTAIN' || tile.type === 'MOUNTAIN_PASS') n += 1;
      }
      return n;
    };
    const continentMassif = massif(continent);
    const archipelagoMassif = massif(archipelago);
    // Floor on continent: at least 3 mountain tiles must exist for
    // the gameplay funnel to work.
    expect(continentMassif).toBeGreaterThanOrEqual(3);
    // Intensity contract: continent (0.7) must produce noticeably
    // MORE mountain than archipelago (0.25) on the same seed. 1.5×
    // is a generous floor; the typical ratio is 2-4×.
    expect(continentMassif).toBeGreaterThan(archipelagoMassif * 1.5);
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
