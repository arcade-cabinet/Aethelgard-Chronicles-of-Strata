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

// M_AUDIT2.ARCH.30 — `core/` is meant to be pure (no upward deps), but
// balance-audit is the one exception that legitimately needs the
// per-biome `habitable` flag from rules/. The alternative (duplicating
// the BIOME_FLAGS table in core/) would be worse — two sources of
// truth for the same data. This documented exception is the right
// shape; if a second core→rules import lands, revisit the layering
// in docs/specs/10-architecture.md.
import { biomeFlagsFor } from '@/rules/biome-flags';
import type { BoardData } from './board';
import { hexDistance } from './hex';

/** Hexes within this radius of a base count toward its reachable buildable area. */
export const REACH_RADIUS = 6;

/** Tolerance the two factions' scores must sit within (fraction of the higher). */
export const BALANCE_TOLERANCE = 0.1;

/** Count buildable-quality tiles within REACH_RADIUS of (cq, cr). */
export function reachableBuildableCount(board: BoardData, cq: number, cr: number): number {
  let n = 0;
  for (const tile of board.tiles.values()) {
    // M_REGISTRY.23 — was a hand-rolled cube-distance formula;
    // replaced by the shared hexDistance helper.
    if (hexDistance(tile.q, tile.r, cq, cr) > REACH_RADIUS) continue;
    // M_REGISTRY.22 — "buildable-quality + decoratable" = habitable
    // slot in the unified biome-flags table.
    if (biomeFlagsFor(tile.type).habitable) n += 1;
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
