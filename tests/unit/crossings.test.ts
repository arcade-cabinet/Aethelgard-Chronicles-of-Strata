import { describe, expect, it } from 'vitest';
import { biomeStyleFor } from '@/core/biome';
import { generateBoard } from '@/core/board';
import { type Crossing, crossingKey, placeCrossings } from '@/core/crossings';
import { HEX_DIRECTIONS } from '@/config/world';
import { getHexKey } from '@/core/hex';

const SEED = 'ancient-silver-forest';

describe('crossingKey', () => {
  it('is order-independent', () => {
    expect(crossingKey('1,0', '2,0')).toBe(crossingKey('2,0', '1,0'));
  });
});

describe('biomeStyleFor', () => {
  it('maps biomes to the four land styles + water', () => {
    expect(biomeStyleFor('HIGHLAND')).toBe('stone');
    expect(biomeStyleFor('MOUNTAIN')).toBe('mountain');
    expect(biomeStyleFor('GRASS')).toBe('grass');
    expect(biomeStyleFor('FOREST')).toBe('grass');
    expect(biomeStyleFor('BEACH')).toBe('sand');
    expect(biomeStyleFor('DESERT')).toBe('sand');
    expect(biomeStyleFor('OCEAN')).toBe('water');
    expect(biomeStyleFor('LAKE')).toBe('water');
  });
});

describe('placeCrossings', () => {
  it('every crossing connects two tiles differing by exactly one level', () => {
    const board = generateBoard(SEED);
    for (const c of board.crossings.values()) {
      const low = board.tiles.get(c.lowKey);
      const high = board.tiles.get(c.highKey);
      expect(low).toBeDefined();
      expect(high).toBeDefined();
      expect((high?.level ?? 0) - (low?.level ?? 0)).toBe(1);
    }
  });

  it('every crossing carries a form and a biome style from the higher tile', () => {
    const board = generateBoard(SEED);
    for (const c of board.crossings.values()) {
      expect(c.form === 'natural' || c.form === 'artificial').toBe(true);
      const high = board.tiles.get(c.highKey);
      expect(c.style).toBe(biomeStyleFor(high?.type ?? 'GRASS'));
    }
  });

  it('places far fewer crossings than candidate cliff edges', () => {
    const board = generateBoard(SEED);
    // count candidate edges — walkable pairs one level apart
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
    // crossings should be a small minority of candidate edges
    expect(board.crossings.size).toBeLessThan(candidates * 0.5);
    expect(board.crossings.size).toBeGreaterThan(0);
  });

  it('is deterministic for the same seed', () => {
    const a = generateBoard(SEED);
    const b = generateBoard(SEED);
    expect([...a.crossings.keys()].sort()).toEqual([...b.crossings.keys()].sort());
  });

  it('connects walkable regions — a crossed board has no large unreachable pocket', () => {
    // A board's walkable tiles, joined by same-level adjacency AND crossings,
    // should form one dominant connected component (crossings do their job).
    const board = generateBoard(SEED);
    const parent = new Map<string, string>();
    const find = (k: string): string => {
      let r = parent.get(k) ?? k;
      if (r !== k) {
        r = find(r);
        parent.set(k, r);
      }
      return r;
    };
    const union = (x: string, y: string) => parent.set(find(x), find(y));
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      const key = getHexKey(tile.q, tile.r);
      for (const dir of HEX_DIRECTIONS) {
        const nKey = getHexKey(tile.q + dir.q, tile.r + dir.r);
        const n = board.tiles.get(nKey);
        if (n?.walkable && n.level === tile.level) union(key, nKey);
      }
    }
    for (const c of board.crossings.values()) union(c.lowKey, c.highKey);

    const sizes = new Map<string, number>();
    let total = 0;
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      total += 1;
      const root = find(getHexKey(tile.q, tile.r));
      sizes.set(root, (sizes.get(root) ?? 0) + 1);
    }
    const largest = Math.max(...sizes.values());
    // the dominant component holds the great majority of walkable tiles
    expect(largest / total).toBeGreaterThan(0.85);
  });

  it('connects two regions joined only by a one-level cliff', () => {
    // a synthetic 2x1 board: a level-1 tile and a level-2 tile, both walkable
    const tiles = new Map([
      [
        '0,0',
        {
          q: 0,
          r: 0,
          level: 1,
          type: 'GRASS' as const,
          moisture: 0.5,
          walkable: true,
          isCrossingLanding: false,
        },
      ],
      [
        '1,0',
        {
          q: 1,
          r: 0,
          level: 2,
          type: 'HIGHLAND' as const,
          moisture: 0.3,
          walkable: true,
          isCrossingLanding: false,
        },
      ],
    ]);
    let n = 0;
    const rng = () => {
      // deterministic stream: first draw < 0.5 ⇒ a connectivity crossing forms
      n += 1;
      return n === 1 ? 0.2 : 0.9;
    };
    const crossings = placeCrossings(tiles, rng);
    expect(crossings.size).toBe(1);
    const c = [...crossings.values()][0] as Crossing;
    expect(c.lowKey).toBe('0,0');
    expect(c.highKey).toBe('1,0');
    expect(c.style).toBe('stone');
  });
});
