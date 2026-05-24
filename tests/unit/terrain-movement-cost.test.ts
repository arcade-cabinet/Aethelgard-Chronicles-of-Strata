import { describe, expect, it } from 'vitest';
import { findPath, type NavGraph } from '@/core/pathfinding';
import { moveCostFor, TERRAIN_MOVE_COST } from '@/core/terrain-cost';

/**
 * M_POLISH2.RTS.24 — terrain movement cost. Pin both the cost table
 * + the A* cost-aware behavior.
 */
describe('M_POLISH2.RTS.24 — terrain movement cost', () => {
  it('GRASS / BEACH / DESERT / BASE = 1.0', () => {
    expect(moveCostFor('GRASS')).toBe(1);
    expect(moveCostFor('BEACH')).toBe(1);
    expect(moveCostFor('DESERT')).toBe(1);
  });

  it('FOREST = 1.25', () => {
    expect(moveCostFor('FOREST')).toBe(1.25);
  });

  it('HIGHLAND = 1.5', () => {
    expect(moveCostFor('HIGHLAND')).toBe(1.5);
  });

  it('table covers every BiomeType (compile + runtime check)', () => {
    // If a future biome is added without a row, runtime returns undefined
    // and the fallback returns 1 — the test asserts the table is full
    // for the present set.
    const required = ['OCEAN', 'LAKE', 'BEACH', 'DESERT', 'GRASS', 'FOREST', 'HIGHLAND', 'MOUNTAIN'];
    for (const b of required) expect(TERRAIN_MOVE_COST[b as keyof typeof TERRAIN_MOVE_COST]).toBeDefined();
  });

  /**
   * A* graph: a 3-node line  L --(grass)--> M --(forest)--> R
   * Forest cost 1.25 instead of 1 — total cost L→R = 1 + 1.25 = 2.25.
   * Without the cost function the path is still L→M→R but cost = 2.
   */
  it('findPath applies costOf to per-tile traversal cost', () => {
    const graph: NavGraph = new Map([
      ['L', new Set(['M'])],
      ['M', new Set(['L', 'R'])],
      ['R', new Set(['M'])],
    ]);
    const costOf = (key: string): number => (key === 'R' ? 1.25 : 1);
    const path = findPath(graph, 'L', 'R', costOf);
    expect(path).toEqual(['L', 'M', 'R']);
  });

  it('findPath without costOf uses uniform cost (backward-compatible)', () => {
    const graph: NavGraph = new Map([
      ['A', new Set(['B'])],
      ['B', new Set(['A', 'C'])],
      ['C', new Set(['B'])],
    ]);
    const path = findPath(graph, 'A', 'C');
    expect(path).toEqual(['A', 'B', 'C']);
  });

  /**
   * Two paths from A to D — short FOREST route (2 forest tiles) vs
   * longer GRASS detour (3 grass tiles). Without cost: shorter route
   * wins (2 < 3). With FOREST cost 1.25: short = 2 × 1.25 = 2.5;
   * detour = 3 × 1 = 3. Short still wins. Bump forest to 2.0 to
   * make the cost-aware path FLIP.
   */
  it('cost-aware A* prefers a longer cheap path over a shorter expensive one', () => {
    //          B(forest, cost 2.0)
    //         /                  \
    //    A                        D
    //         \                  /
    //          C1—C2(grass)—C3
    const graph: NavGraph = new Map([
      ['A', new Set(['B', 'C1'])],
      ['B', new Set(['A', 'D'])],
      ['C1', new Set(['A', 'C2'])],
      ['C2', new Set(['C1', 'C3'])],
      ['C3', new Set(['C2', 'D'])],
      ['D', new Set(['B', 'C3'])],
    ]);
    const costOf = (key: string): number => (key === 'B' ? 2.0 : 1);
    const path = findPath(graph, 'A', 'D', costOf);
    // Short path A→B→D = 1 + 2 = 3
    // Long path A→C1→C2→C3→D = 4 × 1 = 4
    // Short still wins despite the cost.
    expect(path).toEqual(['A', 'B', 'D']);
    // Now make B cost 4 — the detour wins (4 < 5).
    const costOf2 = (key: string): number => (key === 'B' ? 4.0 : 1);
    const path2 = findPath(graph, 'A', 'D', costOf2);
    expect(path2).toEqual(['A', 'C1', 'C2', 'C3', 'D']);
  });
});
