import { describe, expect, it } from 'vitest';
import { BALANCE_TOLERANCE, balanceReport, isBalanced } from '@/core/balance-audit';
import { generateBoard } from '@/core/board';

/** Find player + enemy centers by the same heuristic findBalancedBoard uses. */
function pickCenters(board: ReturnType<typeof generateBoard>): {
  player: { q: number; r: number };
  enemy: { q: number; r: number };
} {
  let center = { q: 0, r: 0 };
  let centerDist = Infinity;
  let edge = { q: 0, r: 0 };
  let edgeDist = 0;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const d = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
    if (d < centerDist) {
      centerDist = d;
      center = { q: tile.q, r: tile.r };
    }
    if (d > edgeDist) {
      edgeDist = d;
      edge = { q: tile.q, r: tile.r };
    }
  }
  return { player: center, enemy: edge };
}

describe('balance audit (M_MAPGEN.10)', () => {
  it('isBalanced flags the today-unfair farthest-walkable enemy placement', () => {
    // The current "farthest walkable tile" heuristic for enemy placement
    // produces an EDGE base; the audit correctly identifies the asymmetric
    // reachable-area as unfair. Pinning the failure mode so the next
    // commit (enemy placement refinement — see directive) shows up as a
    // GREEN flip rather than a silent improvement. Expected behavior
    // TODAY: most seeds fail.
    const seeds = Array.from({ length: 8 }, (_, i) => `balance-sample-${i}`);
    let failed = 0;
    for (const seed of seeds) {
      const board = generateBoard(seed, 18, true);
      const c = pickCenters(board);
      if (!isBalanced(board, c.player, c.enemy)) failed += 1;
    }
    expect(failed).toBeGreaterThanOrEqual(4); // documents today's asymmetry
  });

  it('balanceReport returns symmetric counts within ratio 0..1', () => {
    const board = generateBoard('balance-report', 18, true);
    const c = pickCenters(board);
    const r = balanceReport(board, c.player, c.enemy);
    expect(r.ratio).toBeGreaterThanOrEqual(0);
    expect(r.ratio).toBeLessThanOrEqual(1);
  });

  it('BALANCE_TOLERANCE is a sensible 10%', () => {
    expect(BALANCE_TOLERANCE).toBe(0.1);
  });
});
