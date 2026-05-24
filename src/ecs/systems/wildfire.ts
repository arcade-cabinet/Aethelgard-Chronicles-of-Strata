/**
 * M_FUN.DYN.WILDFIRE — dynamic FOREST wildfire propagation.
 *
 * State model:
 *   - `game.wildfires` (Map<tileKey, BurnState>) is the source of
 *     truth. Keys are getHexKey(q, r); BurnState carries the burn
 *     life + spread-tick accumulator.
 *   - Tuning lives in `src/config/mapgen.json` under "wildfire"
 *     (validated by `WILDFIRE_TUNING` in `src/config/mapgen.ts`).
 *     NO hardcoded constants in this file.
 *
 * Lifecycle per burning tile, per spread-tick:
 *   1. Damage every Health-bearing entity standing on the tile
 *      (`damagePerTick`). Fire does not pick sides.
 *   2. If any neighbour is OCEAN or LAKE → extinguish immediately
 *      (water-adjacency rule per PRD §7.8).
 *   3. Otherwise roll `spreadChance` against the event PRNG for each
 *      FOREST neighbour not already burning; on success the
 *      neighbour ignites with a full `burnTicks` life.
 *   4. Decrement burnTicksRemaining. ≤ 0 → extinguish.
 *
 * Ignition:
 *   `igniteWildfire(game, tiles, q, r)` is idempotent and tile-aware:
 *   non-FOREST or already-burning tiles return false. Random-event
 *   triggers call it gated by `ignitionChancePerEvent`.
 *
 * Determinism: every roll uses `game.eventRng`. No `Math.random()`.
 * Burning tiles are iterated in sorted key order so the same seed
 * yields the same burn pattern.
 */
import { WILDFIRE_TUNING } from '@/config/mapgen';
import type { Tile } from '@/core/board';
import { getHexKey, hexNeighbors } from '@/core/hex';
import { Health, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Per-tile burn state. */
export interface BurnState {
  /** How many spread-ticks remain before the tile extinguishes. */
  burnTicksRemaining: number;
  /** Seconds since the last spread tick fired for this tile. */
  secondsSinceTick: number;
}

/** Outcome bag returned each tick — caller can use this for VFX / a11y. */
export interface WildfireTickResult {
  /** Tile keys that extinguished this call. */
  extinguished: string[];
  /** Tile keys that newly ignited this call (spread). */
  spreadTo: string[];
}

/**
 * Ignite a single tile. Returns true on success, false if the tile
 * isn't FOREST or is already burning.
 */
export function igniteWildfire(
  game: GameState,
  tiles: Map<string, Tile>,
  q: number,
  r: number,
): boolean {
  const key = getHexKey(q, r);
  const tile = tiles.get(key);
  if (!tile || tile.type !== 'FOREST') return false;
  if (game.wildfires.has(key)) return false;
  game.wildfires.set(key, {
    burnTicksRemaining: WILDFIRE_TUNING.burnTicks,
    secondsSinceTick: 0,
  });
  return true;
}

/**
 * Advance the wildfire simulation by `dt` seconds. Mutates
 * `game.wildfires` in place + entity Health components.
 */
export function wildfireSystem(
  game: GameState,
  tiles: Map<string, Tile>,
  dt: number,
): WildfireTickResult {
  const extinguished: string[] = [];
  const spreadTo: string[] = [];
  if (game.wildfires.size === 0) return { extinguished, spreadTo };

  // Snapshot keys in sorted order BEFORE mutation. Iterating a
  // Map while inserting into it is undefined for re-added keys
  // under the V8 spec; the snapshot keeps determinism.
  const burningKeys = [...game.wildfires.keys()].sort();
  const newIgnitions: Array<[string, BurnState]> = [];

  for (const key of burningKeys) {
    const state = game.wildfires.get(key);
    if (!state) continue;
    state.secondsSinceTick += dt;
    if (state.secondsSinceTick < WILDFIRE_TUNING.tickSeconds) continue;
    state.secondsSinceTick = 0;

    const tile = tiles.get(key);
    if (!tile) {
      game.wildfires.delete(key);
      extinguished.push(key);
      continue;
    }

    // Damage any Health-bearing entity standing on this tile.
    for (const e of game.world.query(Health, HexPosition)) {
      const pos = e.get(HexPosition);
      if (!pos || getHexKey(pos.q, pos.r) !== key) continue;
      const h = e.get(Health);
      if (!h) continue;
      e.set(Health, {
        ...h,
        current: Math.max(0, h.current - WILDFIRE_TUNING.damagePerTick),
      });
    }

    // Water-adjacency extinguishes immediately. hexNeighbors returns
    // pre-formatted hex keys so no re-keying needed.
    const neighbourKeys = hexNeighbors(tile.q, tile.r);
    const adjacentWater = neighbourKeys.some((nKey) => {
      const t = tiles.get(nKey);
      return t?.type === 'OCEAN' || t?.type === 'LAKE';
    });
    if (adjacentWater) {
      game.wildfires.delete(key);
      extinguished.push(key);
      continue;
    }

    // Spread to FOREST neighbours, bounded by the registry cap so
    // a worst-case all-FOREST map can't lock the main thread on
    // O(N * 6) iterations per spread tick. Once the projected
    // post-tick population would exceed the cap, drop further
    // spread rolls this tick (the existing fires continue to burn
    // normally — only the *spread* is gated).
    const projectedTotal = () =>
      game.wildfires.size + newIgnitions.length;
    for (const nKey of neighbourKeys) {
      if (projectedTotal() >= WILDFIRE_TUNING.maxConcurrent) break;
      if (game.wildfires.has(nKey)) continue;
      if (newIgnitions.some(([k]) => k === nKey)) continue;
      const t = tiles.get(nKey);
      if (t?.type !== 'FOREST') continue;
      if (game.eventRng() < WILDFIRE_TUNING.spreadChance) {
        newIgnitions.push([
          nKey,
          { burnTicksRemaining: WILDFIRE_TUNING.burnTicks, secondsSinceTick: 0 },
        ]);
        spreadTo.push(nKey);
      }
    }

    // Decrement burn life AFTER spread + damage — a tile burning
    // through its last tick still gets to do damage and spread that
    // tick (mirrors a real fire flashing out only at the end of
    // its life, not at the start of its last tick).
    state.burnTicksRemaining -= 1;
    if (state.burnTicksRemaining <= 0) {
      game.wildfires.delete(key);
      extinguished.push(key);
    }
  }

  for (const [k, v] of newIgnitions) game.wildfires.set(k, v);
  return { extinguished, spreadTo };
}
