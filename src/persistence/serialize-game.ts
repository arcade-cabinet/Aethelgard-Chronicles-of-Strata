/**
 * Full game-state snapshot (M_HARDENING.1) — covers EVERYTHING needed to
 * resume a session: the ECS world + economy + clock + weather + research +
 * rally + zones + the new-game config (seedPhrase / mapSize / difficulty /
 * eventSeed). Deterministic-derived state (board, navGraph, resourceNodes,
 * aiPlayers) is rebuilt by re-running startGame(config) at load time; only
 * mutable state needs to round-trip.
 */

import { z } from 'zod';
import { ECONOMY } from '@/config/economy';
import { type Faction, RESOURCE_TYPES, type ResourceType } from '@/ecs/components';
import type { GameClock } from '@/game/clock';
import type { GameEconomy } from '@/game/economy';
import { type GameState, runEconomyTick, startGame } from '@/game/game-state';
import type { RallyState } from '@/game/rally';
import type { ResearchId } from '@/game/research';
import type { Weather, WeatherState } from '@/game/weather';
import type { ZoneState } from '@/game/zone';
import { deserializeWorld, serializeWorld, type WorldSnapshot } from './serialize';

/** Serialized form of one faction's ZoneState — Sets/Maps as arrays. */
interface ZoneSnapshot {
  controlled: string[];
  observed: string[];
  pulsing: Array<[string, number]>;
  /** Generation counter (M_MICRO.5.2) — defaults to 0 on resume. */
  generation?: number;
}

/**
 * M_FUN.DYN.FIX.SAVE-GAP — wildfire / quake / volcano snapshot
 * blocks. Stored as plain JSON-safe shapes (Maps serialized as
 * `[string, number][]` arrays). Defaults reconstruct cleanly on
 * v1→v2 migration (no active fires, fresh volcano cooldown).
 */
interface WildfireEntry {
  key: string;
  burnTicksRemaining: number;
  secondsSinceTick: number;
}

interface VolcanoSnapshot {
  position: string | null;
  cooldown: number;
  /** Array form of Map<tileKey, lavaSecondsRemaining>. */
  lavaTiles: Array<[string, number]>;
  /** Array form of Map<tileKey, fertileSecondsRemaining>. */
  fertileTiles: Array<[string, number]>;
}

/** Full game snapshot — everything needed to resume. */
export interface GameSnapshot {
  /** Snapshot format version — bumped on any breaking schema change. */
  version: number;
  config: {
    seedPhrase: string;
    mapSize: number;
    difficulty: 'easy' | 'normal' | 'hard';
    eventSeed: string;
  };
  world: WorldSnapshot;
  economy: Record<Faction, GameEconomy>;
  clock: GameClock;
  weather: Weather;
  research: { purchased: string[] };
  rally: RallyState;
  zones: Record<Faction, ZoneSnapshot>;
  outcome: GameState['outcome'];
  /** M_FUN.DYN — burning-tile registry; empty on v0.3 saves (v1→v2 migration). */
  wildfires?: WildfireEntry[];
  /** M_FUN.DYN — quake shake countdown in seconds; 0 on v0.3 saves. */
  quakeShakeRemaining?: number;
  /** M_FUN.DYN — volcano state; absent on v0.3 saves (rebuilt fresh by startGame). */
  volcano?: VolcanoSnapshot;
}

// M_FUN.DYN.FIX.SAVE-GAP — bumped to 2 to flag presence of the
// dynamic-terrain blocks. v1 saves load fine: the migration leaves
// the new fields undefined; deserializeGame uses fresh defaults
// (no active fires, fresh volcano cooldown — the same state a
// brand-new game has at t=0).
const SNAPSHOT_VERSION = 2;

/** ZoneState → serializable form (Set+Map → arrays). */
function zoneToSnapshot(zone: ZoneState): ZoneSnapshot {
  return {
    controlled: Array.from(zone.controlled),
    observed: Array.from(zone.observed),
    pulsing: Array.from(zone.pulsing.entries()),
    generation: zone.generation,
  };
}

/** ZoneSnapshot → live ZoneState. */
function zoneFromSnapshot(snap: ZoneSnapshot): ZoneState {
  return {
    controlled: new Set(snap.controlled),
    observed: new Set(snap.observed),
    pulsing: new Map(snap.pulsing),
    generation: snap.generation ?? 0,
  };
}

/** Build a full snapshot of the live game. */
export function serializeGame(game: GameState): GameSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    config: {
      seedPhrase: game.seedPhrase,
      mapSize: game.mapSize,
      difficulty: game.difficulty,
      eventSeed: game.eventSeed,
    },
    world: serializeWorld(game.world),
    economy: {
      player: { ...game.economy.player },
      enemy: { ...game.economy.enemy },
    },
    clock: { ...game.clock },
    weather: { ...game.weather },
    research: { purchased: Array.from(game.research.purchased) },
    rally: { ...game.rally },
    zones: {
      player: zoneToSnapshot(game.zones.player),
      enemy: zoneToSnapshot(game.zones.enemy),
    },
    outcome: game.outcome,
    wildfires: Array.from(game.wildfires.entries()).map(([key, s]) => ({
      key,
      burnTicksRemaining: s.burnTicksRemaining,
      secondsSinceTick: s.secondsSinceTick,
    })),
    quakeShakeRemaining: game.quakeShakeRemaining,
    volcano: {
      position: game.volcano.position,
      cooldown: game.volcano.cooldown,
      lavaTiles: Array.from(game.volcano.lavaTiles.entries()),
      fertileTiles: Array.from(game.volcano.fertileTiles.entries()),
    },
  };
}

/**
 * M_FUN.MAP.SERIALIZE-VOLCANO-DEDUP — restore a volcano tile map (lavaTiles
 * or fertileTiles) from a raw array of [hexKey, value] pairs. Centralises the
 * bounds-checking and defensive-validation logic that was duplicated for each
 * of the two maps inside deserializeGame.
 *
 * @param raw   - The raw value from the snapshot (must be Array<[string, number]>)
 * @param dest  - The Map to populate (cleared first)
 * @param limit - Maximum number of entries accepted (default 500)
 */
function restoreVolcanoTileMap(
  raw: unknown,
  dest: Map<string, number>,
  limit = 500,
): void {
  dest.clear();
  if (!Array.isArray(raw)) return;
  for (const pair of raw.slice(0, limit)) {
    if (
      !Array.isArray(pair) ||
      typeof pair[0] !== 'string' ||
      pair[0].length > 32 ||
      !Number.isFinite(pair[1])
    )
      continue;
    dest.set(pair[0], Math.max(0, pair[1] as number));
  }
}

/**
 * Reconstruct a live GameState from a snapshot. Deterministic-derived state
 * (board, navGraph, aiPlayers, resourceNodes, default entities) is rebuilt by
 * calling startGame(config) — the seed makes that step byte-equal. Then the
 * mutable state overlays: world is replaced with the deserialized one;
 * economy/clock/weather/research/rally/zones/outcome are overwritten.
 *
 * The resulting GameState is drop-in compatible with everything that
 * consumes the live one (runEconomyTick, the HUD, the AI player tick).
 */
export function deserializeGame(snap: GameSnapshot): GameState {
  // M_AUDIT2.ARCH.36 — migrate old-version snapshots forward to the
  // current SNAPSHOT_VERSION before validating. Empty table today;
  // first schema bump adds entries here and existing saves carry
  // through instead of bricking.
  const migrated = migrateSnapshot(
    snap as unknown as Record<string, unknown>,
  ) as unknown as GameSnapshot;
  // M_SEC.5 — structural validation BEFORE any Object.assign. A tampered
  // snapshot (corrupted SQLite row on a rooted device, malicious save
  // upload in a future cloud-save feature, browser-DevTools-injected
  // IndexedDB write) can carry __proto__ keys, NaN/Infinity numbers,
  // out-of-bounds mapSize. Reject upfront so the renderer never sees
  // poisoned state.
  validateSnapshot(migrated);
  snap = migrated;
  // Step 1 — rebuild the deterministic baseline from the config.
  const game = startGame(snap.config);
  // Step 2 — discard the fresh world; replace with the persisted one.
  const restoredWorld = deserializeWorld(snap.world);
  // koota worlds are object refs; swap in place so r3f components keep
  // their `game` reference. Replace the property; consumers re-query on tick.
  (game as { world: typeof restoredWorld }).world = restoredWorld;
  // Step 3 — overlay all mutable game-level state. Whitelisted keys ONLY
  // (no Object.assign with snapshot data — caller-controlled keys).
  game.economy.player = pickEconomy(snap.economy.player);
  game.economy.enemy = pickEconomy(snap.economy.enemy);
  game.clock.elapsed = safeFinite(snap.clock.elapsed, 0);
  // M_SEC.5 follow-up (security audit HIGH) — validate weather.state
  // against the WeatherState enum. An attacker-controlled `"__proto__"`
  // (or any unknown string) makes WEATHER_SPEED_MULTIPLIER[state]
  // resolve to undefined, NaN-poisoning the pathFollowSystem multiplier
  // and silently stalling/teleporting every unit each tick.
  game.weather.state = isValidWeatherState(snap.weather.state) ? snap.weather.state : 'sunny';
  game.weather.timer = safeFinite(snap.weather.timer, 0);
  // ResearchId is a narrow union but stored as strings on disk; runtime
  // safety comes from the registry lookup, not the union tag.
  game.research.purchased = new Set(snap.research.purchased as ResearchId[]);
  game.rally.targetKey = typeof snap.rally.targetKey === 'string' ? snap.rally.targetKey : '';
  game.zones.player = zoneFromSnapshot(snap.zones.player);
  game.zones.enemy = zoneFromSnapshot(snap.zones.enemy);
  game.outcome = snap.outcome === 'win' || snap.outcome === 'loss' ? snap.outcome : 'playing';
  // M_FUN.DYN.FIX.SAVE-GAP — restore dynamic-terrain state with caps.
  if (Array.isArray(snap.wildfires)) {
    game.wildfires.clear();
    const MAX_WILDFIRES = 500; // generous; bigger than runtime cap
    for (const entry of snap.wildfires.slice(0, MAX_WILDFIRES)) {
      if (
        !entry ||
        typeof entry.key !== 'string' ||
        entry.key.length > 32 ||
        !Number.isFinite(entry.burnTicksRemaining) ||
        !Number.isFinite(entry.secondsSinceTick)
      )
        continue;
      game.wildfires.set(entry.key, {
        burnTicksRemaining: Math.max(0, Math.floor(entry.burnTicksRemaining)),
        secondsSinceTick: Math.max(0, entry.secondsSinceTick),
      });
    }
  }
  game.quakeShakeRemaining = Math.max(0, Math.min(60, safeFinite(snap.quakeShakeRemaining, 0)));
  if (snap.volcano && typeof snap.volcano === 'object') {
    const v = snap.volcano;
    game.volcano.position =
      typeof v.position === 'string' && v.position.length <= 32 ? v.position : null;
    game.volcano.cooldown = Math.max(0, safeFinite(v.cooldown, 0));
    restoreVolcanoTileMap(v.lavaTiles, game.volcano.lavaTiles);
    restoreVolcanoTileMap(v.fertileTiles, game.volcano.fertileTiles);
  }
  // Step 4 — run a zero-delta tick so derived caches (buildSites map,
  // selection ids) re-sync with the restored world.
  runEconomyTick(game, 0);
  return game;
}

// ---------------------------------------------------------------------------
// Validation (M_SEC.5) — reject tampered / prototype-polluted snapshots.
// ---------------------------------------------------------------------------

/** Hard cap on world-entity count a snapshot may contain (M_SEC.11). */
const MAX_ENTITY_COUNT = 5000;

/** Hard cap on board radius (covers Huge tier + headroom). */
const MAX_MAP_SIZE = 50;

/** Allowlist of valid weather states — must mirror WeatherState union. */
const VALID_WEATHER_STATES: ReadonlySet<WeatherState> = new Set(['sunny', 'fog', 'rain']);

/** True if `s` is one of the WeatherState enum values. */
function isValidWeatherState(s: unknown): s is WeatherState {
  return typeof s === 'string' && VALID_WEATHER_STATES.has(s as WeatherState);
}

/** Coerce to finite number; fallback if NaN / Infinity / non-number. */
function safeFinite(n: unknown, fallback: number): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** Whitelisted economy keys; rejects __proto__ / constructor / unknown slots. */
function pickEconomy(eco: unknown): GameEconomy {
  const e = (eco ?? {}) as Record<string, unknown>;
  // Iterate RESOURCE_TYPES — any slot added to resources.json
  // automatically migrates with a 0 default; no per-slot edit
  // needed here. Same migration pattern as mana/peakSupply.
  const totals = {} as Record<ResourceType, number>;
  for (const slot of RESOURCE_TYPES) totals[slot] = safeFinite(e[slot], 0);
  return {
    ...totals,
    usedSupply: safeFinite(e.usedSupply, 0),
    // M_EXPANSION.U.122 — peak supply across the match; defaults to
    // 0 for v0.3 saves that predate the slot.
    peakSupply: safeFinite(e.peakSupply, 0),
    // Default to the fresh-game cap, not a magic 5 (simplifier feedback).
    maxSupply: safeFinite(e.maxSupply, ECONOMY.startingResources.maxSupply),
    kills: safeFinite(e.kills, 0),
    // M_FUN.QA.AIVAI.ZONE-BREAKDOWN — kills-by-zone slot; defaults
    // to all-zeros for pre-v0.5 saves (snapshot version bump not
    // needed — same migration pattern as mana/peakSupply).
    killsByZone: {
      skirmish: safeFinite((e.killsByZone as Record<string, unknown> | undefined)?.skirmish, 0),
      encroachment: safeFinite(
        (e.killsByZone as Record<string, unknown> | undefined)?.encroachment,
        0,
      ),
      assault: safeFinite((e.killsByZone as Record<string, unknown> | undefined)?.assault, 0),
    },
    // M_FUN.QA.AIVAI.PEON-METRICS — peon cadence counters; defaults
    // to all-zero/-1 for pre-v0.5 saves (same migration pattern as
    // killsByZone — no snapshot version bump needed).
    peonMetrics: {
      depositCount: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.depositCount,
        0,
      ),
      firstWoodAt: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.firstWoodAt,
        -1,
      ),
      firstHouseAt: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.firstHouseAt,
        -1,
      ),
      totalRoundTripSec: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.totalRoundTripSec,
        0,
      ),
      roundTrips: safeFinite((e.peonMetrics as Record<string, unknown> | undefined)?.roundTrips, 0),
      disruptions: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.disruptions,
        0,
      ),
      peonIdleTicks: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.peonIdleTicks,
        0,
      ),
      peonActiveTicks: safeFinite(
        (e.peonMetrics as Record<string, unknown> | undefined)?.peonActiveTicks,
        0,
      ),
    },
  };
}

/**
 * Snapshot migration table (M_AUDIT2.ARCH.36).
 *
 * Each entry takes a snapshot at version N and returns one at version N+1.
 * `migrateSnapshot(snap)` walks the chain from `snap.version` up to
 * `SNAPSHOT_VERSION`, applying every entry along the way. When a future
 * schema change lands, add ONE row here; existing saves carry forward.
 *
 * v1 → v2: M_FUN.DYN.FIX.SAVE-GAP added the wildfires +
 * quakeShakeRemaining + volcano blocks. v1 saves migrate by
 * filling defaults.
 */
type SnapshotMigration = (snap: Record<string, unknown>) => Record<string, unknown>;
const SNAPSHOT_MIGRATIONS: Record<number, SnapshotMigration> = {
  // v1 → v2 (M_FUN.DYN.FIX.SAVE-GAP): wildfires, quakeShakeRemaining,
  // volcano added. v1 saves never carried these — default to empty
  // burn registry, no shake, and an absent volcano block (the
  // deserialize path treats undefined as "leave the startGame()
  // defaults in place", which is correct: a v1 save predates
  // M_FUN.DYN entirely, so its world has no fires/lava/shake state
  // to restore).
  1: (snap) => ({
    ...snap,
    version: 2,
    wildfires: [],
    quakeShakeRemaining: 0,
    // volcano stays undefined so the deserialize path keeps the
    // fresh-from-startGame placement (which may or may not have
    // placed a volcano this seed — that's deterministic anyway).
  }),
};

function migrateSnapshot(snap: Record<string, unknown>): Record<string, unknown> {
  let current = snap;
  while (typeof current.version === 'number' && current.version < SNAPSHOT_VERSION) {
    const migrate = SNAPSHOT_MIGRATIONS[current.version];
    if (!migrate) {
      throw new Error(
        `serialize-game: no migration from snapshot version ${current.version} to ${SNAPSHOT_VERSION}`,
      );
    }
    current = migrate(current);
  }
  return current;
}

/**
 * Reject snapshots whose shape would NaN-poison the renderer or wedge the
 * sim. Type assertions in deserializeGame then have a verified baseline.
 * Throws with a precise reason on failure so the App-level catch can show
 * the user "save corrupted".
 *
 * M_AUDIT2.ARCH.36 — validateSnapshot is called AFTER migrateSnapshot
 * by deserializeGame, so version-N saves auto-upgrade to current
 * SNAPSHOT_VERSION before the structural check.
 */
/**
 * M_FUN.FOUNDATION.ZOD-PERSIST — declarative validation of the
 * save snapshot. Replaces the hand-rolled chain of typeof / array /
 * length checks with a Zod schema that mirrors the GameSnapshot
 * interface. The schema is intentionally PERMISSIVE on nested
 * objects (clock, weather, world entity rows etc) since the
 * deserialize path already field-by-field copies the values it
 * trusts. The schema's job is to reject SHAPE corruption + cap
 * the size knobs before any consumer can be NaN-poisoned.
 */
// z.record(string, unknown) is the v4-compatible "any object with
// any extra keys is fine" — replaces the deprecated .passthrough().
const _OpaqueObj = z.record(z.string(), z.unknown());

const SaveSnapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  config: z.object({
    seedPhrase: z.string().min(1).max(256),
    // M_SEC.5 — mapSize must be an integer in [1, MAX_MAP_SIZE].
    mapSize: z.number().int().min(1).max(MAX_MAP_SIZE),
    difficulty: z.enum(['easy', 'normal', 'hard']),
    eventSeed: z.string().min(1).max(256),
  }),
  world: z.object({ entities: z.array(z.unknown()).max(MAX_ENTITY_COUNT) }).and(_OpaqueObj),
  economy: z.object({ player: _OpaqueObj, enemy: _OpaqueObj }),
  clock: _OpaqueObj,
  weather: _OpaqueObj,
  research: z.object({ purchased: z.array(z.string()) }),
  rally: _OpaqueObj,
  zones: z.object({ player: _OpaqueObj, enemy: _OpaqueObj }),
  outcome: z.string(),
  // M_FUN.DYN — optional dynamic-terrain snapshot blocks; missing
  // on v1 saves (migration fills defaults).
  wildfires: z.array(z.unknown()).optional(),
  quakeShakeRemaining: z.number().optional(),
  volcano: _OpaqueObj.optional(),
});

function validateSnapshot(snap: unknown): asserts snap is GameSnapshot {
  // Special-case the version mismatch so existing callers (migration
  // framework + serialize-game test) keep getting the original
  // 'snapshot version N not supported' message they grep for.
  // migrateSnapshot rejects versions older than current with its own
  // 'no migration from version N' message; an unknown future version
  // (> SNAPSHOT_VERSION) falls through to here.
  if (
    snap &&
    typeof snap === 'object' &&
    (snap as { version?: unknown }).version !== SNAPSHOT_VERSION
  ) {
    throw new Error(
      `serialize-game: snapshot version ${String((snap as { version?: unknown }).version)} not supported (expected ${SNAPSHOT_VERSION})`,
    );
  }
  const result = SaveSnapshotSchema.safeParse(snap);
  if (!result.success) {
    // Prefix Zod issue paths with 'serialize-game:' so the message
    // matches the CorruptSaveError boundary the App listens for.
    const first = result.error.issues[0];
    const path = first?.path?.join('.') ?? '(root)';
    throw new Error(
      `serialize-game: snapshot validation failed at ${path}: ${first?.message ?? 'unknown'}`,
    );
  }
}
