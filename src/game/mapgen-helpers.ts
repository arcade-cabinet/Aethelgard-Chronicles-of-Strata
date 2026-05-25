/**
 * M_EXPANSION.D.171 — mapgen helpers extracted from
 * src/game/game-state.ts so the host file stays under the 600-line
 * cognitive-load threshold. Pure functions — no game-state
 * mutation; safe to import anywhere.
 */
import { hexNeighbors, parseHexKey } from '@/core/hex';
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

/** Resource-bearing biomes that can host wood / stone nodes. */
const RESOURCE_BIOMES = new Set(['FOREST', 'HIGHLAND', 'MOUNTAIN', 'SWAMP']);

/**
 * M_V9.MAPGEN.4X-BALANCE — two additional gates active only when
 * playerCount >= 5 (4X mode threshold):
 *
 *   (a) For each of the N potential base positions (the N most
 *       spread-out walkable tiles), there must be >= 3 tiles with
 *       a resource-bearing biome within 5 axial hexes.
 *   (b) The central 30% radius band must have >= 8 neutral walkable
 *       tiles (tiles not at the board's extremes; proxy for a
 *       viable contested neutral zone).
 *
 * Both gates skip entirely when playerCount < 5.
 */
export function passes4xBalanceGates(board: BoardData, playerCount: number): boolean {
  if (playerCount < 5) return true;

  // Collect all walkable tiles sorted by distance from origin (descending —
  // most spread-out = furthest from center first).
  const walkable: { q: number; r: number; dist: number }[] = [];
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const dist = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
    walkable.push({ q: tile.q, r: tile.r, dist });
  }
  walkable.sort((a, b) => b.dist - a.dist);

  // Gate (a): check the N candidate bases (furthest N walkable tiles).
  const candidateBases = walkable.slice(0, playerCount);
  for (const base of candidateBases) {
    let resourceCount = 0;
    // BFS up to 5 axial hexes.
    const seen = new Set<string>();
    const queue: Array<{ q: number; r: number; d: number }> = [{ ...base, d: 0 }];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const key = `${cur.q},${cur.r}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const tile = board.tiles.get(key);
      if (tile && RESOURCE_BIOMES.has(tile.type)) resourceCount++;
      if (cur.d < 5) {
        for (const nk of hexNeighbors(cur.q, cur.r)) {
          if (!seen.has(nk)) {
            const { q: nq, r: nr } = parseHexKey(nk);
            queue.push({ q: nq, r: nr, d: cur.d + 1 });
          }
        }
      }
    }
    if (resourceCount < 3) return false;
  }

  // Gate (b): count neutral walkable tiles in the central 30% radius band.
  // "Central 30%" = dist <= 0.3 * maxDist.
  const maxDist = walkable.length > 0 ? walkable[0]!.dist : 0;
  const threshold = maxDist * 0.3;
  let centralNeutral = 0;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const dist = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
    if (dist <= threshold) centralNeutral++;
  }
  return centralNeutral >= 8;
}

export function findBalancedBoard(
  seedPhrase: string,
  mapSize: number,
  mapType: 'balanced' | 'continent' | 'archipelago' | 'dry-land',
  playerCount = 2,
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
    // M_V9.MAPGEN.4X-BALANCE — additional gates for 4X (playerCount >= 5).
    if (!passes4xBalanceGates(board, playerCount)) continue;
    return board;
  }
  return last ?? generateBoard(seedPhrase, mapSize, true, mapType);
}
