/**
 * M_FUN.DYN.QUAKE — earthquake event.
 *
 * Picks an epicentre at random (any non-water tile in `safetyRing`+
 * from the map edge), gathers all tiles within `clusterRadius` of
 * the epicentre, then applies a stochastic flip table to up to
 * `maxFlips` of them. The flip table is intentionally narrow — only
 * topology shifts that mean something tactically:
 *
 *   HIGHLAND      → MOUNTAIN_PASS  (carve a new chokepoint)
 *   MOUNTAIN_PASS → HIGHLAND       (heal a chokepoint)
 *   MOUNTAIN      → MOUNTAIN_PASS  (new pass through impassable terrain)
 *   GRASS / FOREST / DESERT       — untouched (a quake doesn't grow
 *                                   trees or melt sand)
 *
 * Each flipped tile re-derives `walkable` via biomeFlagsFor so the
 * navmesh sees the change on the next aiSystem pass. NavGraph
 * invalidation is the caller's responsibility (game-state's
 * runEconomyTick already rebuilds the graph each turn).
 *
 * Determinism: every roll uses `game.eventRng`. Pure mutation of
 * the existing tile records; no entity work.
 */
import { QUAKE_TUNING } from '@/config/mapgen';
import type { BoardData, Tile } from '@/core/board';
import { getHexKey } from '@/core/hex';
import { biomeRule } from '@/config/mapgen';
import type { GameState } from '@/game/game-state';

/** Outcome bag — caller uses this for VFX / aria-live announcements. */
export interface QuakeResult {
  /** The epicentre tile key, or null if the roll failed to find one. */
  epicentre: string | null;
  /** Tile keys that flipped. */
  flipped: string[];
  /** Seconds of camera shake to apply. */
  shakeSeconds: number;
}

const FLIP_TABLE: Partial<Record<Tile['type'], Tile['type']>> = {
  HIGHLAND: 'MOUNTAIN_PASS',
  MOUNTAIN_PASS: 'HIGHLAND',
  MOUNTAIN: 'MOUNTAIN_PASS',
};

/**
 * Trigger an earthquake centred on a random non-water tile. Returns
 * the outcome bag describing what flipped. No-ops cleanly when no
 * eligible epicentre exists (a board with only water + sand can
 * fail to find one; the event silently misses).
 */
export function triggerQuake(game: GameState, board: BoardData): QuakeResult {
  const eligible: Tile[] = [];
  for (const t of board.tiles.values()) {
    if (FLIP_TABLE[t.type] !== undefined) eligible.push(t);
  }
  if (eligible.length === 0) {
    return { epicentre: null, flipped: [], shakeSeconds: 0 };
  }
  const epicentre = eligible[Math.floor(game.eventRng() * eligible.length)];
  if (!epicentre) {
    return { epicentre: null, flipped: [], shakeSeconds: 0 };
  }
  const epiKey = getHexKey(epicentre.q, epicentre.r);

  // Collect all tiles within clusterRadius (axial distance) of the
  // epicentre that have a flip-table entry.
  const candidates: Tile[] = [];
  for (const t of board.tiles.values()) {
    const dq = t.q - epicentre.q;
    const dr = t.r - epicentre.r;
    const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    if (dist > QUAKE_TUNING.clusterRadius) continue;
    if (FLIP_TABLE[t.type] !== undefined) candidates.push(t);
  }
  // Stable order BEFORE shuffle so determinism survives Map iteration.
  candidates.sort((a, b) => {
    if (a.q !== b.q) return a.q - b.q;
    return a.r - b.r;
  });
  // Fisher-Yates with eventRng — pick up to maxFlips.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(game.eventRng() * (i + 1));
    const tmp = candidates[i];
    const other = candidates[j];
    if (!tmp || !other) continue;
    candidates[i] = other;
    candidates[j] = tmp;
  }
  const picks = candidates.slice(0, QUAKE_TUNING.maxFlips);

  const flipped: string[] = [];
  for (const t of picks) {
    const next = FLIP_TABLE[t.type];
    if (!next) continue;
    t.type = next;
    // Re-derive walkable from the new type's biome flags. PR #10
    // 05:46Z follow-up: with the corrected massif elevation contract
    // (MOUNTAIN_PASS=5, MOUNTAIN=6, VOLCANO=7), the prior `t.level < 5`
    // hard-floor would mis-classify MOUNTAIN_PASS as unwalkable.
    // biomeRule.walkable is the single source of truth (PASS=true,
    // MOUNTAIN=false). Re-align the tile elevation to the new biome's
    // canonical tier and use rule.walkable directly — no redundant
    // numeric guard.
    const rule = biomeRule(t.type);
    t.level = rule.elevation;
    t.walkable = rule.walkable;
    flipped.push(getHexKey(t.q, t.r));
  }

  return { epicentre: epiKey, flipped, shakeSeconds: QUAKE_TUNING.shakeSeconds };
}
