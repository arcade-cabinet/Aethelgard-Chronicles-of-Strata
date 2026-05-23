/**
 * Fair-balance audit (M_MAPGEN.10). After a board generates + the bases
 * are placed, compute a per-faction "reachable buildable area" score and
 * verify the two factions sit within ±10% of each other. If the metric
 * fails, callers can re-roll with a derived sub-seed until it passes
 * (capped at N attempts).
 *
 * The metric is intentionally simple + deterministic: count the GRASS +
 * FOREST + HIGHLAND tiles within a `REACH_RADIUS` of each base. Both
 * factions getting similar terrain area produces fair starts even when
 * the surrounding map is asymmetric.
 */
import type { BoardData } from './board';

/** Hexes within this radius of a base count toward its reachable buildable area. */
export const REACH_RADIUS = 6;

/** Tolerance the two factions' scores must sit within (fraction of the higher). */
export const BALANCE_TOLERANCE = 0.1;

/** Count buildable-quality tiles within REACH_RADIUS of (cq, cr). */
function reachableBuildableCount(board: BoardData, cq: number, cr: number): number {
  let n = 0;
  for (const tile of board.tiles.values()) {
    const d =
      (Math.abs(tile.q - cq) + Math.abs(tile.r - cr) + Math.abs(tile.q + tile.r - cq - cr)) / 2;
    if (d > REACH_RADIUS) continue;
    if (tile.type === 'GRASS' || tile.type === 'FOREST' || tile.type === 'HIGHLAND') {
      n += 1;
    }
  }
  return n;
}

/**
 * Returns whether the board's two base reachable-buildable counts sit within
 * `BALANCE_TOLERANCE`. Symmetric: `min/max >= 1 - tol`.
 */
export function isBalanced(
  board: BoardData,
  playerCenter: { q: number; r: number },
  enemyCenter: { q: number; r: number },
): boolean {
  const a = reachableBuildableCount(board, playerCenter.q, playerCenter.r);
  const b = reachableBuildableCount(board, enemyCenter.q, enemyCenter.r);
  if (a === 0 || b === 0) return false;
  const ratio = Math.min(a, b) / Math.max(a, b);
  return ratio >= 1 - BALANCE_TOLERANCE;
}

/** Diagnostic — the two counts + the ratio for logging / tests. */
export function balanceReport(
  board: BoardData,
  playerCenter: { q: number; r: number },
  enemyCenter: { q: number; r: number },
): { player: number; enemy: number; ratio: number } {
  const player = reachableBuildableCount(board, playerCenter.q, playerCenter.r);
  const enemy = reachableBuildableCount(board, enemyCenter.q, enemyCenter.r);
  const ratio = Math.min(player, enemy) / Math.max(player, enemy, 1);
  return { player, enemy, ratio };
}
