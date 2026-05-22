import { describe, expect, it } from 'vitest';
import type { BoardData, Tile } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { buildNavGraph, findPath } from '@/core/pathfinding';
import { rampKey } from '@/core/ramps';

/** Build a tiny hand-made board for deterministic graph tests. */
function makeBoard(
  specs: Array<{ q: number; r: number; level: number; walkable: boolean }>,
  rampEdges: Array<[string, string]> = [],
): BoardData {
  const tiles = new Map<string, Tile>();
  for (const s of specs) {
    tiles.set(getHexKey(s.q, s.r), {
      q: s.q,
      r: s.r,
      level: s.level,
      type: s.walkable ? 'GRASS' : 'OCEAN',
      moisture: 0.5,
      walkable: s.walkable,
    });
  }
  const ramps = new Map(
    rampEdges.map(([a, b]) => [rampKey(a, b), { lowKey: a, highKey: b }] as const),
  );
  return { seedPhrase: 'test', tiles, ramps };
}

describe('A* pathfinding', () => {
  it('finds a path between two reachable flat tiles', () => {
    const board = makeBoard([
      { q: 0, r: 0, level: 2, walkable: true },
      { q: 1, r: 0, level: 2, walkable: true },
      { q: 2, r: 0, level: 2, walkable: true },
    ]);
    const graph = buildNavGraph(board);
    const path = findPath(graph, '0,0', '2,0');
    expect(path).toEqual(['0,0', '1,0', '2,0']);
  });

  it('refuses to path through an ocean tile', () => {
    const board = makeBoard([
      { q: 0, r: 0, level: 2, walkable: true },
      { q: 1, r: 0, level: 0, walkable: false },
      { q: 2, r: 0, level: 2, walkable: true },
    ]);
    const graph = buildNavGraph(board);
    expect(findPath(graph, '0,0', '2,0')).toBeNull();
  });

  it('crosses an elevation change only when a ramp exists', () => {
    const noRamp = makeBoard([
      { q: 0, r: 0, level: 2, walkable: true },
      { q: 1, r: 0, level: 3, walkable: true },
    ]);
    expect(findPath(buildNavGraph(noRamp), '0,0', '1,0')).toBeNull();

    const withRamp = makeBoard(
      [
        { q: 0, r: 0, level: 2, walkable: true },
        { q: 1, r: 0, level: 3, walkable: true },
      ],
      [['0,0', '1,0']],
    );
    expect(findPath(buildNavGraph(withRamp), '0,0', '1,0')).toEqual(['0,0', '1,0']);
  });

  it('returns null when no path exists', () => {
    const board = makeBoard([
      { q: 0, r: 0, level: 2, walkable: true },
      { q: 5, r: 0, level: 2, walkable: true },
    ]);
    expect(findPath(buildNavGraph(board), '0,0', '5,0')).toBeNull();
  });

  it('refuses to cross a level delta of 2 even with a ramp edge present', () => {
    const board = makeBoard(
      [
        { q: 0, r: 0, level: 2, walkable: true },
        { q: 1, r: 0, level: 4, walkable: true },
      ],
      [['0,0', '1,0']],
    );
    expect(findPath(buildNavGraph(board), '0,0', '1,0')).toBeNull();
  });
});
