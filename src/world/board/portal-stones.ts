/**
 * M_V6.PORTAL.STONES-EVENT — rare biome-event portal-stone placement.
 *
 * Architecture:
 *   - Random-events tick rolls 1-in-200 once map clock > 5min.
 *   - On hit, two PORTAL_STONE tiles get placed on opposite ends of the
 *     map (max-distance walkable tile pair) + linked via reciprocal
 *     portalTo + shared portalGroupId.
 *   - GameState carries `portalStoneCooldowns: Map<FactionId, number>`
 *     so each faction has its own 60s cooldown after using a stone
 *     (prevents portal-spam zerg rushes).
 *
 * v0.6 substrate ships:
 *   - Pure placement helper `placePortalStones(board, prng)` that
 *     returns the two chosen tile keys (callers tile.type = PORTAL_STONE)
 *   - Per-faction cooldown helpers (read / refresh).
 *
 * Random-event trigger + per-use cooldown UI land in M_V6.MYTH.EVENTS
 * when the random-event registry pattern is established.
 */
import type { BoardData, Tile } from '@/core/board';
import { hexDistance } from '@/core/hex';

export interface PortalStonePair {
  /** Hex key of the first stone. */
  keyA: string;
  /** Hex key of the second stone (linked to keyA). */
  keyB: string;
  /** Shared portalGroupId for both stones. */
  portalGroupId: string;
}

/**
 * Find the two walkable tiles farthest apart on the board and return
 * them as a PORTAL_STONE candidate pair. The caller is responsible for
 * setting `tile.type = 'PORTAL_STONE'` + `portalTo` + `portalGroupId`
 * on each returned tile.
 *
 * Why farthest-apart: the v0.6 design intent says "opposite ends of
 * the map" — the longest walkable path benefits the player most as a
 * shortcut, and the pair is visually unambiguous (a portal from one
 * corner to the other).
 *
 * Determinism: pure pairwise scan over walkable tiles in Map insertion
 * order; same board → same pair. No PRNG calls (the placement is
 * deterministic given the board; the random-event TRIGGER is what's
 * stochastic).
 */
export function findPortalStoneCandidates(board: BoardData): PortalStonePair | null {
  // Collect walkable land tiles only — no OCEAN / LAKE / MOUNTAIN cores.
  const walkable: Tile[] = [];
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    if (tile.type === 'OCEAN' || tile.type === 'LAKE') continue;
    walkable.push(tile);
  }
  if (walkable.length < 2) return null;
  let best: { a: Tile; b: Tile; d: number } | null = null;
  for (let i = 0; i < walkable.length; i++) {
    for (let j = i + 1; j < walkable.length; j++) {
      const a = walkable[i] as Tile;
      const b = walkable[j] as Tile;
      const d = hexDistance(a.q, a.r, b.q, b.r);
      if (!best || d > best.d) best = { a, b, d };
    }
  }
  if (!best) return null;
  const keyA = `${best.a.q},${best.a.r}`;
  const keyB = `${best.b.q},${best.b.r}`;
  return {
    keyA,
    keyB,
    portalGroupId: `portal-stone-${keyA}-${keyB}`,
  };
}

/**
 * Apply a PORTAL_STONE pair to the board: set both tiles' type, link
 * via reciprocal portalTo, share the groupId. Returns the modified
 * pair for caller bookkeeping (e.g. random-events state). The board
 * map mutation is in place.
 */
export function placePortalStones(
  board: BoardData,
  pair: PortalStonePair,
): { tileA: Tile | null; tileB: Tile | null } {
  const tileA = board.tiles.get(pair.keyA) ?? null;
  const tileB = board.tiles.get(pair.keyB) ?? null;
  if (tileA) {
    tileA.type = 'PORTAL_STONE';
    tileA.portalTo = pair.keyB;
    tileA.portalGroupId = pair.portalGroupId;
  }
  if (tileB) {
    tileB.type = 'PORTAL_STONE';
    tileB.portalTo = pair.keyA;
    tileB.portalGroupId = pair.portalGroupId;
  }
  return { tileA, tileB };
}

/**
 * Default per-faction portal-stone cooldown in seconds. A faction that
 * uses a portal stone is blocked from using ANY portal stone for this
 * many seconds — prevents portal-spam zerg rushes.
 */
export const PORTAL_STONE_COOLDOWN_SECONDS = 60;

/**
 * Returns true when the given faction is currently free to use a
 * portal stone (cooldown expired or never used). Pure read.
 */
export function isPortalStoneAvailable(
  cooldowns: Map<string, number>,
  factionId: string,
  nowSeconds: number,
): boolean {
  const expiresAt = cooldowns.get(factionId);
  if (expiresAt === undefined) return true;
  return nowSeconds >= expiresAt;
}

/**
 * M_V7.PORTAL-STONES.TRIGGER — random-event roll for the rare
 * portal-stones placement. Per the v0.6 directive: "1 in 200 ticks
 * once map clock > 5min places two PORTAL_STONE decorative tiles on
 * opposite ends of the map."
 *
 * v0.5/v0.6 left this as just the substrate helpers; v0.7 wires the
 * actual roll. The trigger fires AT MOST ONCE per game (placed pair
 * stays for the rest of the match; cooldowns are per-use, separate).
 *
 * Returns the placed pair on a successful roll, or null when:
 *   - map clock <= 300 seconds (5-min gate),
 *   - random roll exceeds the 1-in-200 threshold,
 *   - portal stones already placed (idempotent — never re-rolls),
 *   - no candidate tile pair exists (tiny board edge case).
 *
 * @param board       - Live BoardData (mutated in place on success).
 * @param prng        - Event-stream PRNG (`game.eventRng`).
 * @param clockSecs   - Current sim-clock seconds.
 */
export function tickPortalStonesTrigger(
  board: import('@/core/board').BoardData,
  prng: () => number,
  clockSecs: number,
): PortalStonePair | null {
  // Gate 1: 5-minute warmup before the roll is even possible.
  // Strict greater than per the v0.6 directive ("> 5min").
  if (clockSecs <= 300) return null;
  // Gate 2: idempotency — if any PORTAL_STONE tile already exists,
  // the trigger has already fired this match.
  for (const tile of board.tiles.values()) {
    if (tile.type === 'PORTAL_STONE') return null;
  }
  // Gate 3: 1-in-200 random roll.
  if (prng() >= 1 / 200) return null;
  // All gates passed — place the pair.
  const pair = findPortalStoneCandidates(board);
  if (!pair) return null;
  placePortalStones(board, pair);
  return pair;
}

/** Mark a faction as having used a portal stone — sets the cooldown expiry. */
export function refreshPortalStoneCooldown(
  cooldowns: Map<string, number>,
  factionId: string,
  nowSeconds: number,
): void {
  cooldowns.set(factionId, nowSeconds + PORTAL_STONE_COOLDOWN_SECONDS);
}
