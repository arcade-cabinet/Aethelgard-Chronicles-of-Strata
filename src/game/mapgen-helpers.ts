/**
 * M_EXPANSION.D.171 — mapgen helpers extracted from
 * src/game/game-state.ts so the host file stays under the 600-line
 * cognitive-load threshold. Pure functions — no game-state
 * mutation; safe to import anywhere.
 */
import { isBalanced } from '@/core/balance-audit';
import { generateBoard } from '@/core/board';
import type { BoardData } from '@/core/board';

/**
 * Match-length scaling for spawn cadence (M_MODES.5). Slower matches
 * let the player breathe; short matches keep pressure on. Identity
 * for 'medium' so existing tuning baselines stay intact.
 */
export function matchLengthScale(length: 'short' | 'medium' | 'long' | 'endless'): number {
  switch (length) {
    case 'short':
      return 0.7;
    case 'medium':
      return 1;
    case 'long':
      return 1.4;
    case 'endless':
      return 1.6;
  }
}

/**
 * M_MAPGEN.10 — try the seed + a few variants and return the first
 * that passes the balance audit. Caps at MAX_BALANCE_ATTEMPTS so a
 * pathological seed doesn't hang. Falls back to the last attempted
 * board.
 */
const MAX_BALANCE_ATTEMPTS = 6;

export function findBalancedBoard(
  seedPhrase: string,
  mapSize: number,
  mapType: 'balanced' | 'continent' | 'archipelago' | 'dry-land',
): BoardData {
  let last: BoardData | null = null;
  for (let attempt = 0; attempt < MAX_BALANCE_ATTEMPTS; attempt++) {
    const seed = attempt === 0 ? seedPhrase : `${seedPhrase}-rb${attempt}`;
    const board = generateBoard(seed, mapSize, true, mapType);
    last = board;
    // pick centers by the same heuristic startGame uses
    let centerTile: { q: number; r: number } | null = null;
    let centerDist = Infinity;
    let edgeTile: { q: number; r: number } | null = null;
    let edgeDist = 0;
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      const d = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
      if (d < centerDist) {
        centerDist = d;
        centerTile = { q: tile.q, r: tile.r };
      }
      if (d > edgeDist) {
        edgeDist = d;
        edgeTile = { q: tile.q, r: tile.r };
      }
    }
    if (!centerTile || !edgeTile) continue;
    if (isBalanced(board, centerTile, edgeTile)) return board;
  }
  return last ?? generateBoard(seedPhrase, mapSize, true, mapType);
}
