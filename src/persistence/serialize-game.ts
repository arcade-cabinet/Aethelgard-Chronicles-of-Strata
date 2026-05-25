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
import type { FactionConfig } from '@/config/factions';
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
    /**
     * M_V6.CARRY.SAVE-N-PLAYER — N-player faction registry. v0.4/v0.5
     * LEGACY 2-faction saves omit this; startGame defaults to
     * LEGACY_FACTIONS overlay (byte-identical legacy replay). v0.6+
     * saves write the user's full registry so 4X / 6-player matches
     * round-trip exactly.
     */
    factions?: FactionConfig[];
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
  /**
   * M_V7.CARRY.SAVE-V6-STATE — every v0.6 runtime substrate field
   * that holds gameplay-meaningful state mid-match. All optional so
   * v0.5/v0.6 v2 saves continue to load (the v2→v3 migration arm
   * initializes each from its `create*State()` default when absent).
   *
   * `diplomacy`: per-pair (a|b) Map serialized as Array<[key, entry]>.
   * `diplomacyProposals`: pending non-aggression pacts (each carries
   *   proposer/target/expiry, all serializable plain).
   * `tradeCooldowns`: Map<relationKey, expirySec> serialized as Array<[k,v]>.
   * `mythEvents`: active event id + expiry + last-fire clock.
   * `victoryRecord`: kind + winner + detected-at, or null.
   * `portalStoneCooldowns`: Map<factionId, expirySec> as Array<[k,v]>.
   */
  diplomacy?: Array<[string, DiplomacyRelationSnapshot]>;
  diplomacyProposals?: Array<{ proposer: string; target: string; expiresAtSeconds: number }>;
  tradeCooldowns?: Array<[string, number]>;
  mythEvents?: { active: { id: string; expiresAtSeconds: number } | null; lastFireSeconds: number };
  victoryRecord?: { kind: string; winner: string; detectedAtSeconds: number } | null;
  portalStoneCooldowns?: Array<[string, number]>;
  /**
   * M_V7.ECONOMY.REGISTRY — N-player extra economy slots beyond the
   * legacy 2-faction `economy` Record. Map<FactionId, GameEconomy>
   * serialized as Array<[id, eco]> tuples. Absent / empty on legacy
   * 2-faction matches; populated for 4X mode (player-3..N).
   */
  economyExtra?: Array<[string, GameEconomy]>;
}

/** Serialized form of one diplomacy relation entry — flat object. */
interface DiplomacyRelationSnapshot {
  relation: 'neutral' | 'ally' | 'enemy' | 'tributary';
  dominant: string | null;
  sinceClockSeconds: number;
}

// M_V7.CARRY.SAVE-V6-STATE — bumped to 3 to flag presence of the
// v0.6 substrate blocks (diplomacy / proposals / cooldowns / mythEvents
// / victoryRecord / portalStoneCooldowns). v2 saves load fine: the
// v2→v3 migration arm leaves the new fields undefined; deserializeGame
// uses fresh defaults from createDiplomacyState() etc. — the same state
// a brand-new game has at t=0.
//
// History:
//   v1 — initial save format (v0.3).
//   v2 — M_FUN.DYN.FIX.SAVE-GAP added wildfires + quakeShakeRemaining
//        + volcano blocks (all optional; v1 saves migrated).
//   v3 — M_V7.CARRY.SAVE-V6-STATE added v0.6 substrate blocks
//        (all optional; v2 saves migrated).
const SNAPSHOT_VERSION = 3;

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
      // M_V6.CARRY.SAVE-N-PLAYER — round-trip the full faction registry
      // so 4X / 6-player matches restore identically. v0.4/v0.5 LEGACY
      // 2-faction games also write this (it's the LEGACY_FACTIONS overlay
      // — harmless redundancy that future-proofs the loader). Deep-clone
      // so post-serialization mutation on game.factions can't leak.
      factions: game.factions.map((f) => ({ ...f })),
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
    // M_V7.CARRY.SAVE-V6-STATE — round-trip every v0.6 substrate
    // field. Maps serialize to Array<[k,v]> tuples; flat objects pass
    // through. All optional in the schema — v2 saves load via the
    // v2→v3 migration arm with empty defaults.
    diplomacy: Array.from(game.diplomacy.relations.entries()).map(([key, entry]) => [
      key,
      {
        relation: entry.relation,
        dominant: entry.dominant,
        sinceClockSeconds: entry.sinceClockSeconds,
      },
    ]),
    diplomacyProposals: game.diplomacyProposals.pending.map((p) => ({
      proposer: p.proposer,
      target: p.target,
      expiresAtSeconds: p.expiresAtSeconds,
    })),
    tradeCooldowns: Array.from(game.tradeCooldowns.cooldowns.entries()),
    mythEvents: {
      active: game.mythEvents.active ? { ...game.mythEvents.active } : null,
      lastFireSeconds: game.mythEvents.lastFireSeconds,
    },
    victoryRecord: game.victoryRecord
      ? {
          kind: game.victoryRecord.kind,
          winner: game.victoryRecord.winner,
          detectedAtSeconds: game.victoryRecord.detectedAtSeconds,
        }
      : null,
    portalStoneCooldowns: Array.from(game.portalStoneCooldowns.entries()),
    // M_V7.ECONOMY.REGISTRY — flatten the N-player economy Map to
    // tuples. Each row is a fresh shallow-clone of the GameEconomy
    // shape (Records pass through; nested peonMetrics is structurally
    // safe to JSON-encode).
    economyExtra: Array.from(game.economyExtra.entries()).map(([id, eco]) => [
      id,
      { ...eco, peonMetrics: { ...eco.peonMetrics } },
    ]),
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
function restoreVolcanoTileMap(raw: unknown, dest: Map<string, number>, limit = 500): void {
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
  // M_V7.CARRY.SAVE-V6-STATE — restore every v0.6 substrate field
  // from the snapshot. Defensive: each field is OPTIONAL (v2 saves
  // omit them; the empty createDiplomacyState() / createMythEventsState()
  // / new Map() defaults from startGame are the right v2→v3 migration).
  // Hard caps on entry counts prevent tampered-save memory blowups
  // (16 factions × 16 = 256 pair entries max; 64 proposals max;
  // 64 cooldowns each side; 1 active myth event; 1 victory record).
  if (Array.isArray(snap.diplomacy)) {
    for (const [keyRaw, entryRaw] of snap.diplomacy.slice(0, 256)) {
      if (typeof keyRaw !== 'string' || keyRaw.length > 200) continue;
      if (!entryRaw || typeof entryRaw !== 'object') continue;
      const e = entryRaw as Partial<{
        relation: string;
        dominant: string | null;
        sinceClockSeconds: number;
      }>;
      if (
        e.relation !== 'ally' &&
        e.relation !== 'enemy' &&
        e.relation !== 'tributary' &&
        e.relation !== 'neutral'
      )
        continue;
      if (e.relation === 'neutral') continue; // empty Map keeps neutral default
      game.diplomacy.relations.set(keyRaw, {
        relation: e.relation,
        dominant: typeof e.dominant === 'string' ? e.dominant : null,
        sinceClockSeconds: safeFinite(e.sinceClockSeconds, 0),
      });
    }
  }
  if (Array.isArray(snap.diplomacyProposals)) {
    for (const p of snap.diplomacyProposals.slice(0, 64)) {
      if (!p || typeof p !== 'object') continue;
      const proposer = (p as { proposer?: unknown }).proposer;
      const target = (p as { target?: unknown }).target;
      const expiresAtSeconds = (p as { expiresAtSeconds?: unknown }).expiresAtSeconds;
      if (typeof proposer !== 'string' || proposer.length > 64) continue;
      if (typeof target !== 'string' || target.length > 64) continue;
      if (!Number.isFinite(expiresAtSeconds)) continue;
      game.diplomacyProposals.pending.push({
        proposer,
        target,
        expiresAtSeconds: expiresAtSeconds as number,
      });
    }
  }
  if (Array.isArray(snap.tradeCooldowns)) {
    for (const pair of snap.tradeCooldowns.slice(0, 64)) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      if (typeof pair[0] !== 'string' || pair[0].length > 200) continue;
      if (!Number.isFinite(pair[1])) continue;
      game.tradeCooldowns.cooldowns.set(pair[0], Math.max(0, pair[1] as number));
    }
  }
  if (snap.mythEvents && typeof snap.mythEvents === 'object') {
    const me = snap.mythEvents;
    game.mythEvents.lastFireSeconds = safeFinite(me.lastFireSeconds, -1);
    if (me.active && typeof me.active === 'object') {
      const id = (me.active as { id?: unknown }).id;
      const exp = (me.active as { expiresAtSeconds?: unknown }).expiresAtSeconds;
      if (typeof id === 'string' && id.length > 0 && Number.isFinite(exp)) {
        game.mythEvents.active = { id, expiresAtSeconds: exp as number };
      }
    }
  }
  if (snap.victoryRecord && typeof snap.victoryRecord === 'object') {
    const vr = snap.victoryRecord;
    const VALID_KINDS = new Set(['military', 'economic', 'scientific', 'diplomatic']);
    if (
      typeof vr.kind === 'string' &&
      VALID_KINDS.has(vr.kind) &&
      typeof vr.winner === 'string' &&
      vr.winner.length > 0 &&
      Number.isFinite(vr.detectedAtSeconds)
    ) {
      game.victoryRecord = {
        kind: vr.kind as 'military' | 'economic' | 'scientific' | 'diplomatic',
        winner: vr.winner,
        detectedAtSeconds: vr.detectedAtSeconds,
      };
    }
  }
  if (Array.isArray(snap.portalStoneCooldowns)) {
    for (const pair of snap.portalStoneCooldowns.slice(0, 64)) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      if (typeof pair[0] !== 'string' || pair[0].length > 64) continue;
      if (!Number.isFinite(pair[1])) continue;
      game.portalStoneCooldowns.set(pair[0], Math.max(0, pair[1] as number));
    }
  }
  // M_V7.ECONOMY.REGISTRY — restore N-player economy slots. Each entry
  // is a shallow GameEconomy shape; trust the writer to have produced
  // safe-JSON. Hard cap at 16 entries (consistent with the faction
  // registry cap; v0.7 4X mode tops out at 6 player factions).
  if (Array.isArray(snap.economyExtra)) {
    for (const pair of snap.economyExtra.slice(0, 16)) {
      if (!Array.isArray(pair) || pair.length !== 2) continue;
      if (typeof pair[0] !== 'string' || pair[0].length > 64) continue;
      const eco = pair[1] as Partial<GameEconomy> | null;
      if (!eco || typeof eco !== 'object') continue;
      // Don't smuggle in a half-shape — only restore when wood/stone/gold
      // are present numbers. Missing slots default to 0 via createEconomy().
      game.economyExtra.set(pair[0], eco as GameEconomy);
    }
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
 *
 * v2 → v3: M_V7.CARRY.SAVE-V6-STATE added every v0.6 runtime
 * substrate field (diplomacy / proposals / cooldowns / mythEvents /
 * victoryRecord / portalStoneCooldowns). v2 saves never carried
 * these — leave each undefined so the deserialize path keeps the
 * fresh-from-startGame defaults (createDiplomacyState() etc).
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
  // v2 → v3 (M_V7.CARRY.SAVE-V6-STATE): diplomacy + mythEvents +
  // cooldowns + victoryRecord all added. v2 saves predate the
  // v0.6 substrate entirely, so empty defaults are correct (no
  // brokered alliances, no active myth events, no recorded victory).
  // deserializeGame's Optional<>?.()-style restore leaves each field
  // at its createDiplomacyState() / createMythEventsState() default
  // when absent from the snapshot.
  2: (snap) => ({
    ...snap,
    version: 3,
    // No active state to carry forward; all defaults are valid.
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

// M_V6.CARRY.SAVE-N-PLAYER — per-faction registry row schema.
// Validates the persisted FactionConfig shape so a tampered/older save
// can't inject malformed faction ids or colors. Optional — absent on
// v0.4/v0.5 LEGACY saves; present on v0.6+ N-player saves.
const FactionConfigSchema = z.object({
  id: z.string().min(1).max(64),
  displayName: z.string().min(1).max(64),
  kind: z.enum(['human', 'ai', 'barbarian']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  archetype: z.enum(['medieval', 'orc', 'undead', 'mystic']),
  personality: z.string().min(1).max(64).optional(),
});

const SaveSnapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  config: z.object({
    seedPhrase: z.string().min(1).max(256),
    // M_SEC.5 — mapSize must be an integer in [1, MAX_MAP_SIZE].
    mapSize: z.number().int().min(1).max(MAX_MAP_SIZE),
    difficulty: z.enum(['easy', 'normal', 'hard']),
    eventSeed: z.string().min(1).max(256),
    // M_V6.CARRY.SAVE-N-PLAYER — optional N-player registry. v0.4/v0.5
    // LEGACY saves omit this; startGame defaults to LEGACY_FACTIONS
    // overlay. v0.6+ saves write the user's full registry so a 6-faction
    // 4X match round-trips exactly.
    // M_V7.CARRY.SAVE-V6-STATE — refine: enforce unique ids across
    // the array. Without this, a tampered save with [{id:'player'}, {id:'player'}]
    // loads cleanly + silently shadows the second slot via findFaction
    // first-match semantics (HIGH-4 from the v0.7 opening review).
    factions: z
      .array(FactionConfigSchema)
      .min(1)
      .max(16)
      .refine(
        (arr) => new Set(arr.map((f) => f.id)).size === arr.length,
        'duplicate faction ids in registry',
      )
      .optional(),
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
  // M_V7.CARRY.SAVE-V6-STATE — v0.6 substrate blocks. All optional;
  // v2 saves load via the v2→v3 migration arm with empty defaults.
  // Strict shape would reject the legacy saves, so each is loosely
  // typed at the Zod layer + defensively parsed in deserializeGame.
  diplomacy: z
    .array(z.tuple([z.string(), _OpaqueObj]))
    .max(256)
    .optional(),
  diplomacyProposals: z.array(_OpaqueObj).max(64).optional(),
  tradeCooldowns: z
    .array(z.tuple([z.string(), z.number()]))
    .max(64)
    .optional(),
  mythEvents: _OpaqueObj.optional(),
  victoryRecord: _OpaqueObj.nullable().optional(),
  portalStoneCooldowns: z
    .array(z.tuple([z.string(), z.number()]))
    .max(64)
    .optional(),
  // M_V7.ECONOMY.REGISTRY — N-player extra economy slots.
  economyExtra: z
    .array(z.tuple([z.string(), _OpaqueObj]))
    .max(16)
    .optional(),
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
