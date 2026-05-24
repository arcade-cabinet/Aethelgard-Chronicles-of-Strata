import { describe, expect, it } from 'vitest';
import { BALANCE_TOLERANCE, balanceReport, isBalanced } from '@/core/balance-audit';
import { generateBoard } from '@/core/board';
import { startGame } from '@/game/game-state';

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
  it('startGame picks a balanced enemy base placement (M_MAPGEN.12)', () => {
    // After the placement refinement, startGame's chosen player + enemy
    // centers MUST pass isBalanced (within 10% tolerance) for the vast
    // majority of seeds.
    const seeds = Array.from({ length: 10 }, (_, i) => `balanced-startgame-${i}`);
    let balanced = 0;
    for (const seed of seeds) {
      const game = startGame({
        seedPhrase: seed,
        mapSize: 18,
        difficulty: 'normal',
        eventSeed: `${seed}-events`,
      });
      const [pq, pr] = game.townHallKey.split(',').map(Number);
      const [eq, er] = game.enemyBaseKey.split(',').map(Number);
      if (
        pq !== undefined &&
        pr !== undefined &&
        eq !== undefined &&
        er !== undefined &&
        isBalanced(game.board, { q: pq, r: pr }, { q: eq, r: er })
      ) {
        balanced += 1;
      }
    }
    expect(balanced).toBeGreaterThanOrEqual(8);
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
