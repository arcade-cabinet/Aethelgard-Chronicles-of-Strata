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
 *
 * M_FUN.MAP.TOPOLOGY.SCREENSHOTS (v0.5.A) — also re-roll on biome
 * variety: a "balanced" board where the noise field happens to
 * produce zero FOREST or zero MOUNTAIN/HIGHLAND is unplayable for
 * the resource-spawn pass even if it passes the centre-edge
 * reachability check. The biome-variety floor lets the same
 * MAX_BALANCE_ATTEMPTS loop find a variant of the seed that has
 * enough of each resource biome to seed wood + stone nodes.
 */
const MAX_BALANCE_ATTEMPTS = 6;

/** Per-mapType minimum tile counts for resource-bearing biomes. */
function hasBiomeVariety(
  board: BoardData,
  mapType: 'balanced' | 'continent' | 'archipelago' | 'dry-land',
): boolean {
  // dry-land is desert-blanketed by design — FOREST is absent, only
  // MOUNTAIN/HIGHLAND need pinning so stone nodes can spawn.
  let forest = 0;
  let stone = 0;
  for (const tile of board.tiles.values()) {
    if (tile.type === 'FOREST') forest++;
    else if (tile.type === 'HIGHLAND' || tile.type === 'MOUNTAIN') stone++;
  }
  // Floors deliberately low (catches "zero of a biome" outright;
  // tuning richer distribution belongs elsewhere).
  if (mapType !== 'dry-land' && forest < 5) return false;
  if (stone < 3) return false;
  return true;
}

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
    if (!isBalanced(board, centerTile, edgeTile)) continue;
    // PATTERN-J: also gate on biome variety so a seed that passes
    // centre-edge reachability but has zero resource biomes (the
    // mike-november-oscar-small problem) re-rolls instead of
    // shipping unplayable.
    if (!hasBiomeVariety(board, mapType)) continue;
    return board;
  }
  return last ?? generateBoard(seedPhrase, mapSize, true, mapType);
}
