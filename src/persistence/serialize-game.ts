/**
 * Full game-state snapshot (M_HARDENING.1) — covers EVERYTHING needed to
 * resume a session: the ECS world + economy + clock + weather + research +
 * rally + zones + the new-game config (seedPhrase / mapSize / difficulty /
 * eventSeed). Deterministic-derived state (board, navGraph, resourceNodes,
 * aiPlayers) is rebuilt by re-running startGame(config) at load time; only
 * mutable state needs to round-trip.
 */
import { type GameState, runEconomyTick, startGame } from '@/game/game-state';
import type { GameEconomy } from '@/game/economy';
import type { GameClock } from '@/game/clock';
import type { Weather, WeatherState } from '@/game/weather';
import type { ResearchId } from '@/game/research';
import type { RallyState } from '@/game/rally';
import type { ZoneState } from '@/game/zone';
import type { Faction } from '@/ecs/components';
import { type WorldSnapshot, deserializeWorld, serializeWorld } from './serialize';
import { ECONOMY } from '@/config/economy';

/** Serialized form of one faction's ZoneState — Sets/Maps as arrays. */
interface ZoneSnapshot {
  controlled: string[];
  observed: string[];
  pulsing: Array<[string, number]>;
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
}

const SNAPSHOT_VERSION = 1;

/** ZoneState → serializable form (Set+Map → arrays). */
function zoneToSnapshot(zone: ZoneState): ZoneSnapshot {
  return {
    controlled: Array.from(zone.controlled),
    observed: Array.from(zone.observed),
    pulsing: Array.from(zone.pulsing.entries()),
  };
}

/** ZoneSnapshot → live ZoneState. */
function zoneFromSnapshot(snap: ZoneSnapshot): ZoneState {
  return {
    controlled: new Set(snap.controlled),
    observed: new Set(snap.observed),
    pulsing: new Map(snap.pulsing),
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
  };
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
  // M_SEC.5 — structural validation BEFORE any Object.assign. A tampered
  // snapshot (corrupted SQLite row on a rooted device, malicious save
  // upload in a future cloud-save feature, browser-DevTools-injected
  // IndexedDB write) can carry __proto__ keys, NaN/Infinity numbers,
  // out-of-bounds mapSize. Reject upfront so the renderer never sees
  // poisoned state.
  validateSnapshot(snap);
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
  return {
    wood: safeFinite(e.wood, 0),
    stone: safeFinite(e.stone, 0),
    gold: safeFinite(e.gold, 0),
    science: safeFinite(e.science, 0),
    usedSupply: safeFinite(e.usedSupply, 0),
    // Default to the fresh-game cap, not a magic 5 (simplifier feedback).
    maxSupply: safeFinite(e.maxSupply, ECONOMY.startingResources.maxSupply),
    kills: safeFinite(e.kills, 0),
  };
}

/**
 * Reject snapshots whose shape would NaN-poison the renderer or wedge the
 * sim. Type assertions in deserializeGame then have a verified baseline.
 * Throws with a precise reason on failure so the App-level catch can show
 * the user "save corrupted".
 */
function validateSnapshot(snap: unknown): asserts snap is GameSnapshot {
  if (!snap || typeof snap !== 'object') {
    throw new Error('serialize-game: snapshot is not an object');
  }
  const s = snap as Record<string, unknown>;
  if (s.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `serialize-game: snapshot version ${String(s.version)} not supported (expected ${SNAPSHOT_VERSION})`,
    );
  }
  const cfg = s.config as Record<string, unknown> | undefined;
  if (!cfg || typeof cfg.seedPhrase !== 'string' || cfg.seedPhrase.length > 256) {
    throw new Error('serialize-game: snapshot.config.seedPhrase missing or too long');
  }
  const mapSize = safeFinite(cfg.mapSize, 0);
  if (mapSize < 1 || mapSize > MAX_MAP_SIZE) {
    throw new Error(`serialize-game: snapshot.config.mapSize out of bounds (got ${mapSize})`);
  }
  if (cfg.difficulty !== 'easy' && cfg.difficulty !== 'normal' && cfg.difficulty !== 'hard') {
    throw new Error('serialize-game: snapshot.config.difficulty not a known tier');
  }
  if (typeof cfg.eventSeed !== 'string' || cfg.eventSeed.length > 256) {
    throw new Error('serialize-game: snapshot.config.eventSeed missing or too long');
  }
  // Entity-count cap (M_SEC.11) — a 100k-entity snapshot would spawn
  // 100k yuka Vehicles on the next AI tick. Reject early.
  const world = s.world as { entities?: unknown[] } | undefined;
  if (!world || !Array.isArray(world.entities)) {
    throw new Error('serialize-game: snapshot.world.entities is not an array');
  }
  if (world.entities.length > MAX_ENTITY_COUNT) {
    throw new Error(
      `serialize-game: snapshot has ${world.entities.length} entities (cap ${MAX_ENTITY_COUNT})`,
    );
  }
  // Shape gates for the nested overlays we Object.assign-replace.
  const eco = s.economy as Record<string, unknown> | undefined;
  if (!eco || typeof eco.player !== 'object' || typeof eco.enemy !== 'object') {
    throw new Error('serialize-game: snapshot.economy.{player,enemy} missing');
  }
  if (!s.clock || typeof s.clock !== 'object') {
    throw new Error('serialize-game: snapshot.clock missing');
  }
  if (!s.weather || typeof s.weather !== 'object') {
    throw new Error('serialize-game: snapshot.weather missing');
  }
  if (!s.research || typeof (s.research as Record<string, unknown>).purchased !== 'object') {
    throw new Error('serialize-game: snapshot.research.purchased missing');
  }
  if (!s.rally || typeof s.rally !== 'object') {
    throw new Error('serialize-game: snapshot.rally missing');
  }
  const zones = s.zones as Record<string, unknown> | undefined;
  if (!zones || typeof zones.player !== 'object' || typeof zones.enemy !== 'object') {
    throw new Error('serialize-game: snapshot.zones.{player,enemy} missing');
  }
}
