/**
 * M_FUN.DYN.VOLCANO — landmark + eruption cycle.
 *
 * State model lives on the GameState as `game.volcano`:
 *   - position    : the VOLCANO tile's hex key (null = no volcano)
 *   - cooldown    : seconds until the next eruption
 *   - lavaTiles   : Map<tileKey, lavaSecondsRemaining>
 *   - fertileTiles: Map<tileKey, fertileSecondsRemaining>
 *
 * Lifecycle (per second of sim time):
 *   1. Tick `cooldown`. When it hits 0, ERUPT: place LAVA on each
 *      walkable radius-1 neighbour, grant a fertile bonus to all
 *      GRASS tiles within `fertileRadius`, ignite WILDFIRE in any
 *      adjacent FOREST tiles (the volcano is a wildfire source),
 *      reset cooldown to `eruptionIntervalSeconds`.
 *   2. Tick each LAVA tile's timer. When it hits 0, revert the
 *      tile to MOUNTAIN_PASS (the basalt cools to walkable rock).
 *   3. Tick each fertile-tile timer. When it hits 0, expire the
 *      bonus (the bonus itself is read by other systems — Farms
 *      built on fertile tiles harvest faster; the volcano system
 *      only owns the timer).
 *   4. Damage every Health-bearing entity standing on a LAVA tile
 *      via `damagePerTick`.
 *
 * Placement: `placeVolcanoLandmark(board, mapRng)` runs once at
 * board-gen. Rolls placementChance; on success picks one MOUNTAIN
 * tile (away from the bases) and converts it to VOLCANO. The mid-
 * game eruption cycle is the dynamic part; placement is static.
 */
import { VOLCANO_TUNING } from '@/config/mapgen';
import type { BoardData, Tile } from '@/core/board';
import { getHexKey, hexDistance, hexNeighbors } from '@/core/hex';
import { biomeFlagsFor } from '@/rules/biome-flags';
import type { Rng } from '@/core/rng';
import { Health, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { igniteWildfire } from './wildfire';

/** Per-volcano runtime state. */
export interface VolcanoState {
  /** The volcano tile's hex key, or null if no volcano on this board. */
  position: string | null;
  /** Seconds until the next eruption. */
  cooldown: number;
  /** Tile keys currently LAVA → seconds remaining. */
  lavaTiles: Map<string, number>;
  /** Tile keys currently fertile → seconds remaining. */
  fertileTiles: Map<string, number>;
}

/** Initial state with no volcano placed yet. */
export function createVolcanoState(): VolcanoState {
  return {
    position: null,
    cooldown: VOLCANO_TUNING.eruptionIntervalSeconds,
    lavaTiles: new Map(),
    fertileTiles: new Map(),
  };
}

/**
 * Place a volcano landmark on the board at board-gen time. Rolls
 * placementChance; on success picks one MOUNTAIN tile (radius ≥ 5
 * from the centre to keep it off potential base zones) and flips
 * it to VOLCANO. Returns the placed tile key or null.
 */
export function placeVolcanoLandmark(board: BoardData, mapRng: Rng): string | null {
  if (mapRng() >= VOLCANO_TUNING.placementChance) return null;
  // Candidate: MOUNTAIN tile that isn't right next to either base
  // safety ring (proxy: distance from origin >= 5).
  const candidates: Tile[] = [];
  for (const t of board.tiles.values()) {
    if (t.type !== 'MOUNTAIN') continue;
    if (hexDistance(t.q, t.r, 0, 0) < 5) continue;
    candidates.push(t);
  }
  if (candidates.length === 0) return null;
  // Stable sort BEFORE PRNG pick so determinism survives Map iteration.
  candidates.sort((a, b) => (a.q !== b.q ? a.q - b.q : a.r - b.r));
  const pick = candidates[Math.floor(mapRng() * candidates.length)];
  if (!pick) return null;
  pick.type = 'VOLCANO';
  pick.walkable = biomeFlagsFor('VOLCANO').walkable;
  return getHexKey(pick.q, pick.r);
}

/** Advance the volcano cycle by `dt` seconds. */
export function volcanoSystem(
  game: GameState,
  dt: number,
  /**
   * M_FUN.PERF.TILE-INDEX — shared per-tick tile→entity index from
   * economy-tick-phases.ts. When provided, lava damage uses O(lavaTiles)
   * lookups instead of an O(entities) scan across all units.
   */
  entityTileIndex?: Map<string, ReturnType<typeof game.world.query>[number][]>,
): void {
  const v = game.volcano;
  if (!v.position) return;
  const tiles = game.board.tiles;
  const volcanoTile = tiles.get(v.position);
  if (!volcanoTile) return;

  // 1. Tick LAVA tiles BEFORE the eruption check so tiles laid by
  //    the eruption in step 3 are NOT decayed in the same tick
  //    (which would instantly revert them when dt > lavaSeconds —
  //    common when test harnesses jump time by `interval+0.01`).
  let didRevert = false;
  for (const [key, remaining] of [...v.lavaTiles.entries()]) {
    const next = remaining - dt;
    if (next <= 0) {
      v.lavaTiles.delete(key);
      const t = tiles.get(key);
      if (t && t.type === 'LAVA') {
        // Cooled basalt = MOUNTAIN_PASS (walkable rock).
        t.type = 'MOUNTAIN_PASS';
        t.walkable = biomeFlagsFor('MOUNTAIN_PASS').walkable;
        didRevert = true;
      }
    } else {
      v.lavaTiles.set(key, next);
    }
  }

  // 2. Tick fertile-tile timers (the bonus is read elsewhere).
  for (const [key, remaining] of [...v.fertileTiles.entries()]) {
    const next = remaining - dt;
    if (next <= 0) v.fertileTiles.delete(key);
    else v.fertileTiles.set(key, next);
  }

  // 3. Cooldown → eruption.
  v.cooldown -= dt;
  let didErupt = false;
  if (v.cooldown <= 0) {
    erupt(game, volcanoTile);
    didErupt = true;
    v.cooldown = VOLCANO_TUNING.eruptionIntervalSeconds;
  }
  // 4. Flag the nav graph dirty whenever topology changed this tick —
  //    either by eruption (new LAVA tiles became impassable) or by a LAVA
  //    tile reverting to MOUNTAIN_PASS (now walkable).
  //    M_FUN.PERF.VOLCANO-LAZY-NAV — tickTerrainPhase rebuilds the graph
  //    once per tick (after all terrain systems) when navGraphDirty is set,
  //    consolidating multiple per-eruption inline rebuilds into one pass.
  if (didErupt || didRevert) {
    game.navGraphDirty = true;
  }

  // 4. Damage units on LAVA.
  // M_FUN.PERF.TILE-INDEX — when the shared index is provided, iterate
  // lavaTiles (O(lavaTiles) × O(1) Map.get) instead of all entities
  // (O(entities) × O(1) Set.has). Falls back to entity-walk when index
  // is absent (direct test calls, future callers without phase wiring).
  if (v.lavaTiles.size > 0) {
    if (entityTileIndex) {
      for (const key of v.lavaTiles.keys()) {
        const onTile = entityTileIndex.get(key);
        if (!onTile) continue;
        for (const e of onTile) {
          const h = e.get(Health);
          if (!h) continue;
          e.set(Health, {
            ...h,
            current: Math.max(0, h.current - VOLCANO_TUNING.damagePerSecond * dt),
          });
        }
      }
    } else {
      // Fallback: O(entities) scan + O(1) Set.has per entity.
      for (const e of game.world.query(Health, HexPosition)) {
        const pos = e.get(HexPosition);
        if (!pos) continue;
        if (!v.lavaTiles.has(getHexKey(pos.q, pos.r))) continue;
        const h = e.get(Health);
        if (!h) continue;
        e.set(Health, {
          ...h,
          current: Math.max(0, h.current - VOLCANO_TUNING.damagePerSecond * dt),
        });
      }
    }
  }
}

function erupt(game: GameState, volcanoTile: Tile): void {
  const tiles = game.board.tiles;
  const v = game.volcano;
  const newLavaKeys: string[] = [];

  // Lay LAVA on every walkable radius-1 neighbour.
  for (const nKey of hexNeighbors(volcanoTile.q, volcanoTile.r)) {
    const t = tiles.get(nKey);
    if (!t) continue;
    // Only convert plausibly-walkable land tiles (not water, not
    // the volcano itself, not adjacent MOUNTAIN — that would just
    // pile lava on rock).
    if (t.type === 'OCEAN' || t.type === 'LAKE' || t.type === 'VOLCANO') continue;
    if (t.type === 'MOUNTAIN') continue;
    // FOREST neighbours catch fire instead of going LAVA.
    if (t.type === 'FOREST') {
      igniteWildfire(game, tiles, t.q, t.r);
      continue;
    }
    t.type = 'LAVA';
    t.walkable = biomeFlagsFor('LAVA').walkable;
    v.lavaTiles.set(nKey, VOLCANO_TUNING.lavaSeconds);
    newLavaKeys.push(nKey);
  }

  // Reviewer-fix (CRITICAL #2 follow-on): LAVA is hard-impassable in
  // biome-flags so A* won't route NEW paths through it. But any unit
  // already standing on the tile when it flips is now stranded on
  // an "impassable" tile — its pathing would refuse to leave. Push
  // each affected entity one tile out to the nearest walkable
  // non-LAVA neighbour (greedy; the volcano is a hazard, not a
  // tactical maze — a one-tile teleport is the kindest semantic).
  if (newLavaKeys.length > 0) {
    const lavaSet = new Set(newLavaKeys);
    for (const e of game.world.query(HexPosition)) {
      const pos = e.get(HexPosition);
      if (!pos) continue;
      const key = getHexKey(pos.q, pos.r);
      if (!lavaSet.has(key)) continue;
      // Find an escape neighbour: walkable AND not in the new lava set.
      for (const nKey of hexNeighbors(pos.q, pos.r)) {
        if (lavaSet.has(nKey)) continue;
        const nt = tiles.get(nKey);
        if (!nt?.walkable) continue;
        e.set(HexPosition, { q: nt.q, r: nt.r, level: nt.level });
        break;
      }
    }
  }

  // Fertile bonus on every GRASS tile within fertileRadius.
  for (const t of tiles.values()) {
    if (t.type !== 'GRASS') continue;
    if (hexDistance(t.q, t.r, volcanoTile.q, volcanoTile.r) > VOLCANO_TUNING.fertileRadius)
      continue;
    v.fertileTiles.set(getHexKey(t.q, t.r), VOLCANO_TUNING.fertileSeconds);
  }
}
