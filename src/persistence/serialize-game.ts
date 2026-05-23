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
import type { Weather } from '@/game/weather';
import type { ResearchId } from '@/game/research';
import type { RallyState } from '@/game/rally';
import type { ZoneState } from '@/game/zone';
import type { Faction } from '@/ecs/components';
import { type WorldSnapshot, deserializeWorld, serializeWorld } from './serialize';

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
  if (snap.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `serialize-game: snapshot version ${snap.version} not supported (expected ${SNAPSHOT_VERSION})`,
    );
  }
  // Step 1 — rebuild the deterministic baseline from the config.
  const game = startGame(snap.config);
  // Step 2 — discard the fresh world; replace with the persisted one.
  const restoredWorld = deserializeWorld(snap.world);
  // koota worlds are object refs; swap in place so r3f components keep
  // their `game` reference. Replace the property; consumers re-query on tick.
  (game as { world: typeof restoredWorld }).world = restoredWorld;
  // Step 3 — overlay all mutable game-level state.
  game.economy.player = { ...snap.economy.player };
  game.economy.enemy = { ...snap.economy.enemy };
  Object.assign(game.clock, snap.clock);
  Object.assign(game.weather, snap.weather);
  // ResearchId is a narrow union but stored as strings on disk; runtime
  // safety comes from the registry lookup, not the union tag.
  game.research.purchased = new Set(snap.research.purchased as ResearchId[]);
  Object.assign(game.rally, snap.rally);
  game.zones.player = zoneFromSnapshot(snap.zones.player);
  game.zones.enemy = zoneFromSnapshot(snap.zones.enemy);
  game.outcome = snap.outcome;
  // Step 4 — run a zero-delta tick so derived caches (buildSites map,
  // selection ids) re-sync with the restored world.
  runEconomyTick(game, 0);
  return game;
}
