/**
 * M_PIVOT.BARBARIAN-CAMPS — neutral aggressor camps placed at game-gen.
 *
 * Architectural decisions enumerated in the v0.5 directive:
 *   5. Placement: clamp(round(N/2)+1, 1, 6) camps, centroid-biased,
 *      ≥6-tile radius from every player base ring.
 *   6. Clearing: HP → 0 emits `barbarian-camp-cleared` event, +50 wood
 *      + +50 stone + 1 random Discovery to the killing faction, tile
 *      becomes RUINS (decorative).
 *
 * Use cases this module covers:
 *   1. Map-gen placement — `placeBarbarianCamps(board, playerBaseKeys,
 *      campCount, prng)` returns ordered camp specs.
 *   2. ECS spawn — `spawnBarbarianCamp(world, spec)` creates a camp
 *      entity with EnemySpawner + FactionTrait + HexPosition + Health
 *      so the existing spawn pipeline drives raid waves.
 *   3. Registry sync — each spawned camp gets a matching FactionConfig
 *      pushed onto `game.factions` so the runtime knows the camp's
 *      banner color + archetype.
 *
 * Clearing rewards land in deathSystem (M_PIVOT.BARBARIAN-CAMPS.CLEAR)
 * which already detects FactionBase deaths; camps are special-cased
 * to emit the reward instead of the game-over outcome flip.
 */
import type { Entity, World } from 'koota';
import type { FactionArchetype, FactionConfig, FactionId } from '@/config/factions';
import type { BoardData } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { EnemySpawner, FactionBase, FactionTrait, Health, HexPosition } from '@/ecs/components';

/**
 * A camp spec returned by `placeBarbarianCamps`. The map-gen layer
 * decides where + how many; the ECS spawn layer turns each spec into a
 * concrete entity. Keeping the spec a plain object (no Entity ref) lets
 * the map-gen pass run pure + deterministic.
 */
export interface BarbarianCampSpec {
  /** Stable faction id for this camp (e.g. `barbarian-camp-1`). */
  factionId: FactionId;
  /** Hex axial position. */
  q: number;
  /** Hex axial position. */
  r: number;
  /** Hex level (height tier for stacked terrain). */
  level: number;
  /** Camp HP — `200 + 50 * nearestPlayerDistance` per directive. */
  hp: number;
  /** Visual archetype for the camp's spawned units + base mesh. */
  archetype: FactionArchetype;
}

/** Default camp count formula per the directive: clamp(round(N/2)+1, 1, 6). */
export function defaultCampCount(playerFactionCount: number): number {
  const n = Math.max(1, playerFactionCount);
  const target = Math.round(n / 2) + 1;
  return Math.max(1, Math.min(6, target));
}

/**
 * M_V11.CAMPS.SPAWN — camp count scales with map size. Per spec:
 *   small  = 2  (radius ≤ 10)
 *   medium = 4  (radius 11..16)
 *   large  = 6  (radius 17..22)
 *   huge   = 8  (radius ≥ 23)
 *
 * Accepts EITHER a MapSizeKey string ('small'|'medium'|'large'|
 * 'huge') OR a numeric radius — startGame plumbs the radius
 * through as a number, so the function buckets by range when given
 * a number.
 *
 * Independent of player-faction count: every match (including
 * legacy 1v1) gets neutral aggressor camps so the v0.11 PvE
 * pressure loop is uniform across modes.
 */
export function campCountForMapSize(mapSize: string | number): number {
  if (typeof mapSize === 'number') {
    if (mapSize <= 10) return 2;
    if (mapSize <= 16) return 4;
    if (mapSize <= 22) return 6;
    return 8;
  }
  switch (mapSize) {
    case 'small':
      return 2;
    case 'large':
      return 6;
    case 'huge':
      return 8;
    default:
      return 4;
  }
}

/**
 * Pick camp tile positions. Centroid-biased — preferring walkable tiles
 * close to the centroid of all walkable LAND tiles, but with a minimum
 * 6-tile separation from every player base. The PRNG ordering is the
 * only stochastic input; given the same board + base keys + count, the
 * result is byte-identical.
 *
 * @param board           - The generated board (tile map + walkable bits)
 * @param playerBaseKeys  - Hex keys of every player faction's base
 * @param campCount       - How many camps to place (clamped 0..N)
 * @param prng            - Map-PRNG (`Math.random` is banned in world/)
 * @returns Ordered camp specs (id `barbarian-camp-1`, `-2`, ... in
 *          placement order). May return fewer than `campCount` if the
 *          board lacks suitable tiles (very small / very dense maps).
 */
export function placeBarbarianCamps(
  board: BoardData,
  playerBaseKeys: readonly string[],
  campCount: number,
  prng: () => number,
): BarbarianCampSpec[] {
  if (campCount <= 0) return [];

  // Compute walkable-land centroid for the bias.
  const walkable: Array<{ q: number; r: number; level: number; key: string }> = [];
  let sumQ = 0;
  let sumR = 0;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    walkable.push({
      q: tile.q,
      r: tile.r,
      level: tile.level,
      key: getHexKey(tile.q, tile.r),
    });
    sumQ += tile.q;
    sumR += tile.r;
  }
  if (walkable.length === 0) return [];
  const cQ = sumQ / walkable.length;
  const cR = sumR / walkable.length;

  // Parse player base positions for the min-distance check.
  const basePositions: Array<{ q: number; r: number }> = [];
  for (const key of playerBaseKeys) {
    const tile = board.tiles.get(key);
    if (tile) basePositions.push({ q: tile.q, r: tile.r });
  }

  const MIN_BASE_RADIUS = 6;

  // Score every candidate: distFromCentroid (lower = better) + tiny
  // PRNG jitter so ties resolve deterministically per-seed.
  const candidates = walkable
    .filter((t) => {
      for (const b of basePositions) {
        if (hexDistance(t.q, t.r, b.q, b.r) < MIN_BASE_RADIUS) return false;
      }
      return true;
    })
    .map((t) => ({
      tile: t,
      score: hexDistance(t.q, t.r, Math.round(cQ), Math.round(cR)) + prng() * 0.001,
    }))
    .sort((a, b) => a.score - b.score);

  // Greedy-pick — keep camps at least MIN_BASE_RADIUS apart from each other too.
  const picks: BarbarianCampSpec[] = [];
  for (const cand of candidates) {
    if (picks.length >= campCount) break;
    let okay = true;
    for (const p of picks) {
      if (hexDistance(cand.tile.q, cand.tile.r, p.q, p.r) < MIN_BASE_RADIUS) {
        okay = false;
        break;
      }
    }
    if (!okay) continue;
    const nearestBaseDist =
      basePositions.length === 0
        ? MIN_BASE_RADIUS
        : Math.min(...basePositions.map((b) => hexDistance(cand.tile.q, cand.tile.r, b.q, b.r)));
    picks.push({
      factionId: `barbarian-camp-${picks.length + 1}`,
      q: cand.tile.q,
      r: cand.tile.r,
      level: cand.tile.level,
      hp: 200 + 50 * nearestBaseDist,
      // v0.5 substrate: every camp starts as 'orc' archetype. v0.6
      // diversifies (undead in graveyard biomes, mystic in highland).
      archetype: 'orc',
    });
  }
  return picks;
}

/**
 * Convert a `BarbarianCampSpec` into a `FactionConfig` registry row.
 * Color is derived from the camp index (deterministic per-game without
 * touching the player palette). Archetype carries over from the spec.
 */
export function factionConfigForCamp(spec: BarbarianCampSpec): FactionConfig {
  // Greys/browns — visually distinct from player palette, signals
  // "neutral aggressor" rather than a player faction. Index off
  // the trailing camp number so cycling through is deterministic.
  // M_V11.POLISH.CAMP-MOB-VISUAL — shift each camp into a distinct
  // grey-tinted hue so the player can tell barbarian-camp-1 mobs
  // from barbarian-camp-2 mobs in the same frame. Kept dim (chroma
  // ≤0.2) so they still read as "neutral aggressor" vs the bright
  // player palette. Hue band: warm-grey → bronze → moss → slate →
  // muddy-purple → blood-rust, each ≈60° apart.
  const CAMP_COLORS = ['#a8736c', '#a89366', '#7c8b5c', '#6c8aa8', '#8a6ca8', '#a86c6c'];
  const idx = Number.parseInt(spec.factionId.replace('barbarian-camp-', ''), 10) - 1;
  const color = CAMP_COLORS[idx % CAMP_COLORS.length] ?? CAMP_COLORS[0]!;
  return {
    id: spec.factionId,
    displayName: `Barbarian Camp ${idx + 1}`,
    kind: 'barbarian',
    color,
    archetype: spec.archetype,
  };
}

/**
 * Spawn one barbarian-camp entity. Carries the camp's FactionTrait so
 * spawnSystem (already iterating EnemySpawner + HexPosition) generates
 * units tagged with this camp's id. Health makes the camp itself
 * clearable by any faction.
 *
 * The FactionBase trait marks this as a "base" for the death-detection
 * + camera-framing systems; camp-specific clearing logic in deathSystem
 * checks `FactionTrait.faction.startsWith('barbarian-camp-')`.
 */
export function spawnBarbarianCamp(world: World, spec: BarbarianCampSpec): Entity {
  return world.spawn(
    HexPosition({ q: spec.q, r: spec.r, level: spec.level }),
    Health({ current: spec.hp, max: spec.hp }),
    // M_V11.CAMPS.MOB-SPAWN — cadence 90-180s (the spawn-system
    // re-rolls on every fire so each tick draws fresh from the
    // band), capped at 4 live mobs per camp.
    EnemySpawner({
      spawnTimer: 0,
      spawnInterval: 90,
      spawnCount: 0,
      mobCap: 4,
      liveMobs: 0,
    }),
    // Cast: FactionTrait.faction is typed Faction (literal union) for
    // compile-time narrowing on the legacy 2-faction case; runtime
    // accepts any string. Camp ids live in the registry, not the union.
    FactionTrait({ faction: spec.factionId as 'player' | 'enemy' }),
    FactionBase(),
  );
}
