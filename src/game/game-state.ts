import type { Entity, World } from 'koota';
import { AiPlayer } from '@/ai/ai-player';
import { BALANCE_TOLERANCE, reachableBuildableCount } from '@/core/balance-audit';
import { type BoardData, generateBoard } from '@/core/board';
import { getHexKey, hexDistance, hexNeighbors, parseHexKey } from '@/core/hex';
import { buildNavGraph, type NavGraph } from '@/core/pathfinding';
import {
  AssignedJob,
  AttractorBehavior,
  Building,
  EnemySpawner,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  ResourceTrait,
  Unit,
} from '@/ecs/components';
import { resetAiDirector } from '@/ecs/systems/ai';
import { type DamageEvent } from '@/ecs/systems/combat';
import { type ResourceDepositEvent } from '@/ecs/systems/deposit';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';
import { type Projectile } from './projectiles';

/**
 * Monotonic counter for projectile React keys — shared across all games.
 * Exported so economy-tick-phases.ts can reference the same singleton
 * (M_FUN.REFACTOR.RUN-ECONOMY-TICK phase extraction).
 */
export const PROJECTILE_ID_REF = { current: 0 };
// M_EXPANSION.D.171 — mapgen helpers (matchLengthScale,
// findBalancedBoard) moved to a sibling (./mapgen-helpers.ts) so
// this file stays under the 600-line cognitive-load threshold. The
// exports are re-imported below alongside the rest of game-state's
// imports.

// M_AUDIT2.ARCH.8 — AI_VISION_RADIUS moved into config/combat.json
// (COMBAT.ai.visionRadiusByDifficulty); accessor `aiVisionRadiusFor`.
// The const lived here for one consumer; moving it to config keeps
// every difficulty-tuning knob in one tunable file.

import { spawnIntervalFor } from '@/config/combat';
import { MAP_RADIUS } from '@/config/world';
import { createEventPrng, createMapPrng } from '@/core/rng';
import { type Faction } from '@/ecs/components';
import {
  createVolcanoState,
  placeVolcanoLandmark,
  type VolcanoState,
} from '@/ecs/systems/volcano';
import { type BurnState } from '@/ecs/systems/wildfire';
import { type GameOutcome } from '@/ecs/systems/win-loss';
import { behaviorsFor, ensureAttractorResources, presetFor } from '@/rules';
import { type ResourceNodePlan, spawnResourceNodes } from '@/world/resource-spawn';
import type { AutoSave } from './auto-save';
import { createClock, type GameClock } from './clock';
import { findBalancedBoard, matchLengthScale } from './mapgen-helpers';
import type { Difficulty } from './difficulty';
import { createEconomy, type GameEconomy } from './economy';
import { createRally, type RallyState } from './rally';
import { createResearch, type ResearchState } from './research';
import { createWeather, type Weather } from './weather';
import { createRandomEventsState, type RandomEventsState } from './random-events';
import { createZoneState, seedZonesFromAttractors, type ZoneState } from './zone';
import {
  tickClockPhase,
  tickCommandPhase,
  tickCombatPhase,
  tickDepositPhase,
  tickScoringPhase,
  tickTerrainPhase,
} from './economy-tick-phases';

export type { Difficulty } from './difficulty';

/**
 * Configuration for starting a new game. Passed to `startGame`.
 * - `seedPhrase` — adjective-adjective-noun map seed (player-visible).
 * - `mapSize` — board radius in hex tiles (defaults to MAP_RADIUS = 20).
 * - `difficulty` — AI scaling preset.
 * - `eventSeed` — the device-level event PRNG seed (from Persistence).
 */
export interface NewGameConfig {
  seedPhrase: string;
  mapSize: number;
  difficulty: Difficulty;
  eventSeed: string;
  /**
   * Game mode preset (M_MODES.1 + M_BRAND.1). Drives default
   * mapSize / matchLength / turnsMode / mapType / win-condition
   * rules. Defaults to 'border-clash' when omitted.
   *   border-clash:   balanced 2-base RTS — the M_MAPGEN guided gen.
   *   frontier-raid:  pure-noise asymmetric map, fast.
   *   long-reign:     TownHalls invulnerable; resign/starve only.
   *   strata-wars:    continent map, longer match, scaled tech tree.
   *   age-of-strata:  4X turn-based — eXplore/eXpand/eXploit/eXterminate.
   *   coexistence:    no-win builder sandbox.
   */
  mode?: GameMode;
  /**
   * M_TURNS.3 — explicit Turn-style override. When omitted, falls
   * back to the preset's `turnsMode`. The player can override via
   * NewGameModal — e.g. picking border-clash but flipping to
   * turn-based for an explore-at-leisure session.
   */
  turnsMode?: 'real-time' | 'turn-based';
  /**
   * M_EXPANSION.F.80 — player-faction palette swap. CSS hex string
   * applied as a uniform character tint to player units. Overrides
   * SKINS.player.characterTint (which defaults to null = native
   * KayKit colours). Picks today: red/blue/green/yellow + null
   * (native).
   */
  playerColor?: string | null;
  /**
   * M_EXPANSION.F.84 — starting bonus pick for the player faction.
   * 'none' (default) is the baseline; the other picks each give a
   * one-shot advantage at game start:
   *   'extra-wood'  +50 wood (≈ 1 extra building's worth)
   *   'extra-peons' +2 spawned Peons at the home tile
   *   'extra-hp'    TownHall starts with +200 max HP
   */
  startingBonus?: 'none' | 'extra-wood' | 'extra-peons' | 'extra-hp';
  /**
   * M_TURNS.2 — explicit max-turn cap. When omitted, falls back to
   * the preset's maxTurns. null is a legitimate override ("uncapped
   * 4X session"); the type accepts undefined too (use preset default).
   */
  maxTurns?: number | null;
  /**
   * M_POLISH3.AIVAI.1 — when true, the player faction is also
   * driven by a yuka AiPlayer (no human input). Used by the e2e
   * AI-vs-AI playthrough harness and by spectator/demo mode. Defaults
   * to false (normal human-controlled player).
   */
  aiVsAi?: boolean;
  /**
   * M_FUN.AI.NAMED — opponent personality key (the-builder,
   * the-raider, the-hoarder, the-diplomat, the-mad-king). See
   * src/config/ai-personalities.json. Defaults to the registry
   * default ('the-diplomat').
   */
  enemyPersonality?: string;
  /**
   * M_FUN.QA.AIVAI — opponent personality key for the PLAYER faction
   * in AI-vs-AI mode (no effect when aiVsAi=false; in interactive
   * play the player's the human). Lets the AI-vs-AI balance suite
   * run cross-personality matchups deterministically.
   */
  playerPersonality?: string;
}

/**
 * Game mode identifier — M_BRAND.1 renamed the v0.3 generic POC
 * keys to Aethelgard-lore names. The keys tell the player the FEEL
 * of the preset they're choosing; the preset itself bundles map /
 * size / turns / AI behaviour (see MODE_PRESETS).
 *
 * Legacy save migration: snapshot-migration.ts maps old keys
 * (red-vs-blue, skirmish, endless, classic-rts, 4x, coexist) to the
 * new ones at deserialize time, so v0.3 saves still load.
 */
export type GameMode =
  | 'border-clash'
  | 'frontier-raid'
  | 'long-reign'
  | 'strata-wars'
  | 'age-of-strata'
  | 'coexistence';

/** The live state of one play session. */
export interface GameState {
  /** The seed phrase the session was started with. */
  seedPhrase: string;
  /** The board radius this session was generated at. */
  mapSize: number;
  /** The AI difficulty level for this session. */
  difficulty: Difficulty;
  /** The event seed string used to initialize the event PRNG. */
  eventSeed: string;
  /** The selected game-mode preset (M_MODES). Defaults to border-clash. */
  mode: GameMode;
  /**
   * M_EXPANSION.F.80 — player faction palette tint. CSS hex string
   * or null = use SKINS default. Read by Units when picking the
   * per-character tint.
   */
  playerColor: string | null;
  /** The generated board. */
  board: BoardData;
  /** The A* navigation graph. */
  navGraph: NavGraph;
  /**
   * M_FUN.PERF.VOLCANO-LAZY-NAV — set to true by any system that mutates
   * board topology (volcanoSystem eruption/revert, buildingDeathSystem).
   * tickTerrainPhase rebuilds navGraph exactly once at the end of the
   * terrain phase if this flag is set, then clears it. This consolidates
   * all per-eruption inline rebuilds into a single rebuild per tick.
   */
  navGraphDirty: boolean;
  /** The koota ECS world. */
  world: World;
  /** The player-controlled pawn entity. */
  playerPawn: Entity;
  /** Per-faction resource totals and supply — both factions are symmetric. */
  economy: Record<Faction, GameEconomy>;
  /** The hex key of the player's home-base (Town Hall) tile. */
  townHallKey: string;
  /** The hex key of the enemy base tile — the enemy's deposit/build anchor. */
  enemyBaseKey: string;
  /** All planned resource node placements for this session. */
  resourceNodes: ResourceNodePlan[];
  /** Building-site entities keyed by hex tile key (for the build system). */
  buildSites: Map<string, Entity>;
  /**
   * Generation counter for `buildSites` (M_AUDIT2.ARCH.22 + .54). The
   * Map ref doesn't change identity on insert/delete, so useMemo deps
   * like `[game.buildSites]` never re-fire. Every commands.ts /
   * building-death.ts mutation bumps this counter; renderers key
   * their memos on it. Same pattern as ZoneState.generation.
   */
  buildSitesGeneration: number;
  /** The player home base ECS entity (the Town Hall — loss condition). */
  townHallEntity: Entity;
  /** The enemy base ECS entity (the graveyard spawner — win condition). */
  enemyBaseEntity: Entity;
  /** Current win/loss outcome; 'playing' until a condition is met. */
  outcome: GameOutcome;
  /** Damage events produced by the last combatSystem tick (for FX). */
  lastDamageEvents: DamageEvent[];
  /** The event PRNG — shared across all combat rolls to preserve determinism. */
  eventRng: () => number;
  /** The game clock — drives the day/night cycle and Orc escalation threshold. */
  clock: GameClock;
  /** The current weather state — drives movement penalty and visual effects. */
  weather: Weather;
  /**
   * M_EXPANSION.F.81 — random-events scheduler state. Advances each
   * tick; on a roll, may fire a one-shot world event
   * (weather-spike / raid-warning / refugee-arrival).
   */
  randomEvents: RandomEventsState;
  /** Which research upgrades have been purchased this session. */
  research: ResearchState;
  /** The barracks rally point — where newly trained footmen are directed. */
  rally: RallyState;
  /** Per-faction zone of control + observed battlefield (spec 102). */
  zones: Record<Faction, ZoneState>;
  /**
   * Controlled-tile-time score per faction (M_MODES.10). Each tick adds
   * `zones[faction].controlled.size * delta` — area under the curve of
   * territory held. GameOverModal renders the final per-faction score.
   */
  score: Record<Faction, number>;
  /**
   * M_EXPANSION.F.71 — Wonder timer per faction. Seconds remaining
   * until a completed Wonder triggers a wonder-win; Infinity = no
   * Wonder built yet. The first faction to reach 0 wins (or, if the
   * other faction destroys it mid-countdown, the timer resets).
   */
  wonderTimers: Record<Faction, number>;
  /**
   * M_POLISH2.MODES.42a — strata-wars zone-control win timer.
   * Seconds the player has held ≥ 80% of controlled tiles. When
   * this reaches 30, outcome flips to 'win'. Resets to 0 when the
   * player drops below 80%. Only ticked in strata-wars mode.
   */
  strataWarsControlTimer: number;
  /**
   * M_EXPANSION.U.111 — speed multiplier applied to runEconomyTick's
   * delta. 1.0 = normal, 2.0 / 4.0 = fast-forward. Determinism-safe:
   * the multiplier is on wall-clock delta, not the event PRNG.
   * Default 1.0 — HUD speed control writes this.
   */
  gameSpeed: number;
  /**
   * Optional turn-based state (M_MODES.8). Present only when the preset's
   * turnsMode === 'turn-based'. `secondsRemaining` is decremented per tick;
   * when it hits 0 the sim pauses + waits for the human to end their turn
   * (button → endTurn(game) command).
   */
  turn?: {
    /** Whose turn it is — 'player' or 'enemy'. */
    active: Faction;
    /** Seconds remaining in this turn before auto-end. */
    secondsRemaining: number;
    /** Total length of each turn (seconds). */
    turnLength: number;
    /**
     * M_TURNS.2 — turns elapsed since the match began (both factions
     * counted; one player turn + one enemy turn = 2). win-loss reads
     * this against the maxTurns cap to decide a time-limit victor.
     */
    turnsElapsed: number;
    /**
     * M_TURNS.2 — cap on total turns. null = uncapped (long-reign,
     * coexistence, real-time modes). When turnsElapsed >= maxTurns,
     * the win-loss system flips outcome to win/loss/draw based on
     * zone-control + score; tie → draw.
     */
    maxTurns: number | null;
  };
  /**
   * Goal-driven AI players, keyed by faction. The enemy faction always has one;
   * the player faction gets one only in AI-vs-AI mode (M8.7 E2E harness).
   */
  aiPlayers: Partial<Record<Faction, AiPlayer>>;
  /**
   * M_FUN.DYN.WILDFIRE — burning-tile registry. Keyed by
   * getHexKey(q, r). Each entry tracks remaining burn ticks +
   * a spread-tick accumulator. Present-but-empty is the default
   * (no fires lit). The wildfireSystem advances this; igniteWildfire
   * adds entries; tiles extinguish either by burning out OR by
   * water-adjacency (RIVER/LAKE/OCEAN neighbour).
   */
  wildfires: Map<string, BurnState>;
  /**
   * M_FUN.DYN.QUAKE — seconds of camera-shake remaining after the
   * last triggered earthquake. Decremented by runEconomyTick; the
   * render layer reads this to apply a brief shake. 0 = no shake.
   */
  quakeShakeRemaining: number;
  /**
   * M_FUN.DYN.VOLCANO — volcano landmark + eruption-cycle state.
   * placeVolcanoLandmark may set position=null (no volcano on this
   * board); when null, volcanoSystem is a no-op every tick.
   */
  volcano: VolcanoState;
  /**
   * The PRIMARY currently-selected entity id (the first in `selectedIds` for
   * single-selection consumers like SelectionPanel). Undefined when nothing is
   * selected. Updated by `selectEntity` / `selectEntities` / `clearSelection`.
   */
  selectedId?: number;
  /**
   * Every currently-selected entity id (M_GAMEPLAY.2 — multi-unit selection).
   * `selectedIds[0]` matches `selectedId`. Empty when nothing is selected.
   */
  selectedIds: number[];
  /**
   * When true, `runEconomyTick` returns early — the simulation freezes
   * (M_GAMEPLAY.7). The HUD's Pause button + the P key toggle this. Used
   * also by the app-suspend handler on mobile.
   */
  paused: boolean;
  /**
   * Active visible projectiles (arrows/bolts) — M_COMBAT_POLISH.1. The
   * offensive-behavior system pushes one per source per fire cadence; the
   * r3f ProjectileLayer animates + despawns. Purely presentation.
   */
  projectiles: Projectile[];
  /** Per-source cadence accumulators — last-fired age per OffensiveBehavior entity id. */
  projectileCooldowns: Map<number, number>;
  /**
   * Resource-deposit events from the most recent tick — fuels the
   * `+N Wood` floating-text popups (M_COMBAT_POLISH.3). Reassigned each
   * tick by `runEconomyTick` so the render layer detects new batches by
   * array-reference identity (same pattern as `lastDamageEvents`).
   */
  lastResourceEvents: ResourceDepositEvent[];
  /**
   * Auto-save timer. Attached by the App layer (which owns the persistence
   * facade); when present, `runEconomyTick` advances it. Absent in tests and
   * headless sims that do not persist.
   */
  autoSave?: AutoSave;
  /**
   * Assign every idle peon to harvest the nearest resource node.
   * Call this to kick-start the autonomous harvest loop.
   */
  assignAllPeonsToHarvest(): void;
}

/** Find the walkable tile closest to the board centre — the pawn spawn. */
function findCentralWalkableTile(board: BoardData): { q: number; r: number; level: number } {
  let best: { q: number; r: number; level: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const dist = hexDistance(tile.q, tile.r, 0, 0);
    if (dist < bestDist) {
      bestDist = dist;
      best = { q: tile.q, r: tile.r, level: tile.level };
    }
  }
  if (!best) throw new Error('Board has no walkable tile — cannot spawn the player pawn');
  return best;
}

/** Up to `count` distinct walkable tiles adjacent to (q, r), nearest-ring first. */
/**
 * Resolve a faction's base hex key from the live game state. M_REGISTRY.16
 * + M_REGISTRY.14 — single source for the per-faction baseKey lookup.
 * Was 4 hand-written `faction === 'player' ? game.townHallKey :
 * game.enemyBaseKey` ternaries scattered across game-state.ts,
 * commands.ts, ai-player.ts (and the deposit-tick allocation in
 * runEconomyTick). Now ONE function the entire codebase consults.
 * A future Necromancer tribe extends this switch in ONE place; every
 * caller auto-uses it.
 */
export function baseKeyFor(game: GameState, faction: Faction): string {
  return faction === 'player' ? game.townHallKey : game.enemyBaseKey;
}

function adjacentWalkableTiles(
  board: BoardData,
  q: number,
  r: number,
  count: number,
): Array<{ q: number; r: number; level: number }> {
  const dirs = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ];
  const out: Array<{ q: number; r: number; level: number }> = [];
  for (const d of dirs) {
    if (out.length >= count) break;
    const tile = board.tiles.get(getHexKey(q + d.q, r + d.r));
    if (tile?.walkable) out.push({ q: q + d.q, r: r + d.r, level: tile.level });
  }
  return out;
}

/**
 * BFS expansion of walkable tiles within `maxDepth` rings of (q,r).
 * Coderabbit MAJOR PR #10 05:46Z — the AIVAI starter spawn previously
 * misused `adjacentWalkableTiles(..., N)` as a radius (the 4th arg is
 * a count of immediate neighbours, NOT a ring depth). This helper is
 * the proper radius-aware fallback when the 6 axial neighbours of a
 * blocked base tile are all non-walkable (peninsula / mountain-locked
 * spawn). Returns up to `count` walkable tiles, prefers nearer rings.
 */
function walkableTilesByExpansion(
  board: BoardData,
  q: number,
  r: number,
  maxDepth: number,
  count: number,
): Array<{ q: number; r: number; level: number }> {
  const out: Array<{ q: number; r: number; level: number }> = [];
  const seen = new Set<string>([getHexKey(q, r)]);
  let frontier: Array<{ q: number; r: number }> = [{ q, r }];
  for (let depth = 0; depth < maxDepth && out.length < count; depth++) {
    const next: Array<{ q: number; r: number }> = [];
    for (const node of frontier) {
      for (const key of hexNeighbors(node.q, node.r)) {
        if (seen.has(key)) continue;
        seen.add(key);
        const tile = board.tiles.get(key);
        if (!tile) continue;
        if (tile.walkable && out.length < count) {
          out.push({ q: tile.q, r: tile.r, level: tile.level });
        }
        next.push({ q: tile.q, r: tile.r });
      }
    }
    frontier = next;
  }
  return out;
}

/**
 * Start a new game.
 *
 * Accepts either a `NewGameConfig` object or a plain `string` seed phrase.
 * When given a string, defaults are applied: mapSize = MAP_RADIUS, difficulty
 * = 'normal', eventSeed = 'default-event-seed'. This keeps existing
 * `startGame('phrase')` call-sites (e.g. in tests) working without changes.
 *
 * Generates the board, builds the nav graph, creates the ECS world, spawns
 * the player pawn, spawns resource nodes, and places the Town Hall on the
 * most central walkable tile.
 */
export function startGame(configOrPhrase: NewGameConfig | string): GameState {
  // Normalise the overloaded argument.
  const config: NewGameConfig =
    typeof configOrPhrase === 'string'
      ? {
          seedPhrase: configOrPhrase,
          mapSize: MAP_RADIUS,
          difficulty: 'normal',
          eventSeed: 'default-event-seed',
        }
      : configOrPhrase;

  // CodeRabbit MEDIUM-5 — the AiDirector is a module-level singleton with a
  // Vehicle Map keyed by koota entity ids. A previous session's stale ids
  // would collide with the new session's freshly-allocated entities. Reset
  // before constructing the new GameState's world.
  resetAiDirector();

  const { seedPhrase, mapSize, difficulty, eventSeed, mode } = config;
  const preset = presetFor(mode);
  // M_MODES.2-.6 — the mode preset drives whether guided map gen runs.
  // red-vs-blue / endless / classic-rts / 4x → guided (M_MAPGEN.3-.9
  // paint passes + safety ring); skirmish → pure noise (asymmetric maps
  // possible).
  // M_MAPGEN.10 — fair-balance audit. For guided modes, try the seed +
  // a few suffix variants and keep the first that passes the per-faction
  // reachable-buildable-area tolerance. Falls back to the original seed
  // if no attempt balances (logged).
  const board = preset.guidedMapGen
    ? findBalancedBoard(seedPhrase, mapSize, preset.mapType)
    : generateBoard(seedPhrase, mapSize, preset.guidedMapGen);
  // M_EXPANSION.F.97 — discoverable hidden bonuses on ~5% of
  // walkable tiles. Uses the map PRNG (createMapPrng) so the same
  // seed places the same bonuses. Wood-weighted distribution (60%
  // wood, 25% stone, 15% gold) — wood is most useful early; the
  // others spice the late-game exploration. Amount tier: 25/40/60.
  const bonusRng = createMapPrng(`${seedPhrase}:f97-discoverable`);
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    if (bonusRng() >= 0.05) continue;
    const roll = bonusRng();
    const type = roll < 0.6 ? 'wood' : roll < 0.85 ? 'stone' : 'gold';
    const amount = type === 'wood' ? 25 : type === 'stone' ? 40 : 60;
    tile.hiddenBonus = { type, amount };
  }
  // A fresh ECS world — death timers and the portal spawn count are now ECS
  // components, so a new session starts clean with no module state to reset.
  const world = createEcsWorld();

  // The Town Hall occupies the most central walkable tile. Peons spawn on
  // adjacent tiles — never on the Town Hall tile itself (they would overlap
  // the building mesh).
  const center = findCentralWalkableTile(board);
  const townHallKey = getHexKey(center.q, center.r);
  // Both factions get a symmetric economy — the player's and the AI enemy's.
  const economy: Record<Faction, GameEconomy> = {
    player: createEconomy(),
    enemy: createEconomy(),
  };
  // M_EXPANSION.F.84 — extra-wood bonus: +50 wood to the player
  // economy (about one extra building's worth of construction).
  if (config.startingBonus === 'extra-wood') {
    economy.player.wood += 50;
  }

  // Mark the Town Hall tile unwalkable BEFORE building the nav graph — units
  // path around the building and deposit from an adjacent tile. The enemy
  // base is marked + the graph rebuilt below, once its tile is picked.
  const townHallTile = board.tiles.get(townHallKey);
  if (townHallTile) townHallTile.walkable = false;
  let navGraph = buildNavGraph(board);

  const peonSpawns = adjacentWalkableTiles(board, center.q, center.r, 2);
  // fall back to the centre tile only if the centre is somehow isolated
  if (peonSpawns.length === 0) peonSpawns.push(center);

  const firstSpawn = peonSpawns[0] ?? center;
  const playerPawn = createCharacter({
    world,
    role: 'Peon',
    q: firstSpawn.q,
    r: firstSpawn.r,
    level: firstSpawn.level,
    selected: true,
  });

  const secondSpawn = peonSpawns[1] ?? firstSpawn;
  createCharacter({
    world,
    role: 'Peon',
    q: secondSpawn.q,
    r: secondSpawn.r,
    level: secondSpawn.level,
    selected: false,
  });

  // M_EXPANSION.F.84 — extra-peons bonus: spawn 2 more Peons at the
  // next available spawn tiles. Falls back to firstSpawn if the
  // peonSpawns list ran out.
  if (config.startingBonus === 'extra-peons') {
    for (let i = 2; i < 4; i++) {
      const spawn = peonSpawns[i] ?? firstSpawn;
      createCharacter({
        world,
        role: 'Peon',
        q: spawn.q,
        r: spawn.r,
        level: spawn.level,
        selected: false,
      });
    }
  }

  // Spawn the player home base (the Town Hall — loss condition when destroyed).
  // Town Hall composes AttractorBehavior (spec 102) — radius drives the
  // map-gen guarantee AND the initial zone-of-control footprint.
  const townHallProfile = behaviorsFor('TownHall');
  // M_EXPANSION.F.84 — apply starting bonus to TownHall HP.
  const bonusHp = config.startingBonus === 'extra-hp' ? 200 : 0;
  // M_FUN.QA.AIVAI.TUNE.PATTERN-C — base HP raised from 500 to
  // 1500. A 15-DPS Footman now takes 100 sim-seconds to solo a
  // TownHall — long enough that the defending faction can muster
  // a counter-force. Solo-rush wins drop out of the matrix.
  const townHallEntity = world.spawn(
    HexPosition({ q: center.q, r: center.r, level: center.level }),
    Building({ buildingType: 'TownHall', isComplete: true, progress: 1 }),
    Health({ current: 1800 + bonusHp, max: 1800 + bonusHp }),
    FactionTrait({ faction: 'player' }),
    FactionBase({ faction: 'player' }),
    ...(townHallProfile.attractor ? [AttractorBehavior(townHallProfile.attractor)] : []),
  );

  // M_MAPGEN.12 — pick the enemy base as the BEST-BALANCED placement,
  // not the farthest walkable tile. We want a tile that (a) sits roughly
  // opposite the player center (high angular distance), (b) has a
  // reachable-buildable area within 10% of the player's. Iterate
  // candidates ordered by distance, pick the first that satisfies the
  // balance audit; fall back to farthest-walkable for skirmish-mode
  // (where guidedMapGen is false the balance test isn't meaningful).
  const playerArea = preset.guidedMapGen ? reachableBuildableCount(board, center.q, center.r) : 0;
  let enemyBaseTile = center;
  let bestScore = -1;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const d = hexDistance(tile.q, tile.r, center.q, center.r);
    if (d < 5) continue; // need real separation
    if (!preset.guidedMapGen) {
      // skirmish: fall back to farthest-walkable
      if (d > bestScore) {
        bestScore = d;
        enemyBaseTile = tile;
      }
      continue;
    }
    // guided: score = (1 - |1 - enemyArea/playerArea|) * distance.
    // Reward balance heavily; distance is a tie-breaker.
    const enemyArea = reachableBuildableCount(board, tile.q, tile.r);
    if (enemyArea === 0 || playerArea === 0) continue;
    const ratio = Math.min(playerArea, enemyArea) / Math.max(playerArea, enemyArea);
    if (ratio < 1 - BALANCE_TOLERANCE) continue; // skip unfair candidates
    const score = ratio * 100 + d; // balance dominates, distance is secondary
    if (score > bestScore) {
      bestScore = score;
      enemyBaseTile = tile;
    }
  }
  // If guided mode found NO balanced candidate, fall back to farthest-walkable.
  if (bestScore < 0) {
    let maxDist = 0;
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      const d = hexDistance(tile.q, tile.r, center.q, center.r);
      if (d > maxDist) {
        maxDist = d;
        enemyBaseTile = tile;
      }
    }
  }

  // Spawn the enemy base — the graveyard (enemy unit spawner — win condition).
  // spawnInterval is difficulty-scaled: easy 60s, normal 45s, hard 30s.
  // Mark the base tile non-walkable + rebuild the nav graph so units cannot
  // path THROUGH the enemy base (the previous code left the tile walkable —
  // CodeRabbit finding, real bug).
  const enemyBaseKey = getHexKey(enemyBaseTile.q, enemyBaseTile.r);
  const enemyBaseBoardTile = board.tiles.get(enemyBaseKey);
  if (enemyBaseBoardTile) {
    enemyBaseBoardTile.walkable = false;
    navGraph = buildNavGraph(board);
  }
  // the enemy base is also an attractor — both factions get a starting
  // zone-of-control footprint and resource guarantee, symmetric by construction.
  const enemyBaseEntity = world.spawn(
    HexPosition({ q: enemyBaseTile.q, r: enemyBaseTile.r, level: enemyBaseTile.level }),
    // M_MODES.5 — match length scales the spawn cadence. classic-rts/long
    // breathes; endless eases up further; short red-vs-blue stays tight.
    EnemySpawner({
      spawnTimer: 0,
      spawnInterval: spawnIntervalFor(difficulty) * matchLengthScale(preset.matchLength),
    }),
    // M_FUN.QA.AIVAI.TUNE.PATTERN-C — equalised AND raised to
    // 1500 HP. Symmetric with the player TownHall above.
    Health({ current: 1800, max: 1800 }),
    FactionTrait({ faction: 'enemy' }),
    FactionBase({ faction: 'enemy' }),
    ...(townHallProfile.attractor ? [AttractorBehavior(townHallProfile.attractor)] : []),
  );

  // Spawn one starting Footman near the Town Hall.
  const footmanSpawn = peonSpawns[0] ?? center;
  createCharacter({
    world,
    role: 'Footman',
    q: footmanSpawn.q,
    r: footmanSpawn.r,
    level: footmanSpawn.level,
  });

  // M_FUN.QA.AIVAI.TUNE — in AI-vs-AI mode the enemy faction needs
  // the SAME starting kit as the player so its AiPlayer has peons
  // to assign to harvest + a Footman to seed military. Without
  // these the enemy AiPlayer would deadlock at "need Barracks
  // before training Footman, but need a Peon to build the
  // Barracks". Single-player mode keeps the asymmetric start —
  // there the enemy gets units from the EnemySpawner cadence.
  const isAiVsAi = typeof config === 'object' && config.aiVsAi;
  if (isAiVsAi) {
    // Coderabbit MAJOR PR #10 05:46Z fix to my prior fix: the 4th
    // arg of adjacentWalkableTiles is a COUNT (cap of immediate
    // neighbours), not a radius. The earlier "wider ring" cascade
    // never actually widened. Use walkableTilesByExpansion for a
    // real BFS expansion up to depth 4; only if EVERY tile within
    // 4 rings is blocked (effectively impossible on a normal map)
    // do we fall back to the base tile.
    let enemyPeonSpawns = adjacentWalkableTiles(board, enemyBaseTile.q, enemyBaseTile.r, 2);
    if (enemyPeonSpawns.length === 0) {
      enemyPeonSpawns = walkableTilesByExpansion(board, enemyBaseTile.q, enemyBaseTile.r, 4, 6);
    }
    if (enemyPeonSpawns.length === 0) enemyPeonSpawns.push(enemyBaseTile);
    for (let i = 0; i < 2; i++) {
      const spawn = enemyPeonSpawns[i] ?? enemyPeonSpawns[0]!;
      createCharacter({
        world,
        role: 'Peon',
        q: spawn.q,
        r: spawn.r,
        level: spawn.level,
        factionOverride: 'enemy',
      });
    }
    const enemyFootmanSpawn = enemyPeonSpawns[0]!;
    createCharacter({
      world,
      role: 'Footman',
      q: enemyFootmanSpawn.q,
      r: enemyFootmanSpawn.r,
      level: enemyFootmanSpawn.level,
      factionOverride: 'enemy',
    });
  }

  // Spawn resource nodes using the map PRNG (deterministic, phrase-only).
  const mapRng = createMapPrng(seedPhrase);
  const eventRng = createEventPrng(eventSeed);
  // 1. natural resource spawn from the biome rules
  // 2. attractor contract — each Town Hall guarantees a minimum of every
  //    resource type within its radius, so a peon always has work in-zone
  //    (spec 102). Run for both factions' attractors deterministically.
  // M_MAPGEN.7 — keep a 3-hex safety ring around each FactionBase clear of
  // randomly-spawned resource nodes so the player has guaranteed buildable
  // space at start. ensureAttractorResources then adds the GUARANTEED nearby
  // resources (further out, within ATTRACTOR_RADIUS=2 of each base anchor).
  let resourceNodes = spawnResourceNodes(board, mapRng, [
    { q: center.q, r: center.r },
    { q: enemyBaseTile.q, r: enemyBaseTile.r },
  ]);
  resourceNodes = ensureAttractorResources(
    board,
    townHallKey,
    center.q,
    center.r,
    resourceNodes,
    mapRng,
  );
  resourceNodes = ensureAttractorResources(
    board,
    enemyBaseKey,
    enemyBaseTile.q,
    enemyBaseTile.r,
    resourceNodes,
    mapRng,
  );
  for (const plan of resourceNodes) {
    world.spawn(
      HexPosition({ q: plan.q, r: plan.r, level: plan.level }),
      ResourceTrait({ resourceType: plan.resourceType, amount: plan.amount }),
    );
  }

  const buildSites = new Map<string, Entity>();

  const game: GameState = {
    seedPhrase,
    mapSize,
    difficulty,
    eventSeed,
    mode: mode ?? 'border-clash',
    // M_EXPANSION.F.80 — player palette pick (or null = SKINS default).
    playerColor: config.playerColor ?? null,
    board,
    navGraph,
    navGraphDirty: false,
    world,
    playerPawn,
    economy,
    townHallKey,
    enemyBaseKey,
    resourceNodes,
    buildSites,
    buildSitesGeneration: 0,
    townHallEntity,
    enemyBaseEntity,
    outcome: 'playing',
    lastDamageEvents: [],
    lastResourceEvents: [],
    selectedIds: [],
    paused: false,
    projectiles: [],
    projectileCooldowns: new Map(),
    eventRng,
    clock: createClock(),
    weather: createWeather(),
    // M_EXPANSION.F.81 — random-events scheduler.
    randomEvents: createRandomEventsState(),
    research: createResearch(),
    rally: createRally(),
    zones: seedZonesFromAttractors({ player: createZoneState(), enemy: createZoneState() }, board, {
      player: center,
      enemy: enemyBaseTile,
    }),
    score: { player: 0, enemy: 0 },
    // M_EXPANSION.F.71 — Infinity = no Wonder built yet for that faction.
    wonderTimers: { player: Infinity, enemy: Infinity },
    // M_FUN.DYN.WILDFIRE — empty burning-tile registry. The wildfire
    // system creates entries via igniteWildfire and prunes via the
    // tick loop; default is the empty map (no fires lit at game start).
    wildfires: new Map<string, BurnState>(),
    // M_FUN.DYN.QUAKE — quake camera-shake countdown (0 = no shake).
    quakeShakeRemaining: 0,
    // M_FUN.DYN.VOLCANO — place a volcano landmark if the roll
    // succeeds (placementChance gates it). Position-less state =
    // no volcano on this board; the volcanoSystem no-ops then.
    volcano: (() => {
      const state = createVolcanoState();
      state.position = placeVolcanoLandmark(board, mapRng);
      return state;
    })(),
    // M_POLISH2.MODES.42a — strata-wars 80%-for-30s win timer. Starts
    // at 0; only ticks in strata-wars mode (see runEconomyTick).
    strataWarsControlTimer: 0,
    // M_EXPANSION.U.111 — speed multiplier; defaults to 1.0.
    gameSpeed: 1,
    // M_MODES.8 + M_TURNS.3 — turn-based superposition. The effective
    // turn style is the player's override (when set by NewGameModal)
    // OR the preset default. 60s turns; player starts.
    // M_TURNS.2 — maxTurns also takes the override → preset chain.
    ...((config.turnsMode ?? preset.turnsMode) === 'turn-based'
      ? {
          turn: {
            active: 'player' as Faction,
            secondsRemaining: 60,
            turnLength: 60,
            turnsElapsed: 0,
            // M_TURNS.2 — `null` is a legitimate override (uncapped),
            // distinct from `undefined` (use preset default). ?? would
            // collapse both to preset default; explicit `in` check
            // preserves the player's null choice.
            maxTurns: 'maxTurns' in config ? (config.maxTurns ?? null) : preset.maxTurns,
          },
        }
      : {}),
    // the enemy faction always runs a yuka AI player; in AI-vs-AI mode
    // (M_POLISH3.AIVAI.1) the player faction also gets one — both
    // factions auto-play, no human input required.
    aiPlayers:
      typeof config === 'object' && config.aiVsAi
        ? {
            enemy: new AiPlayer('enemy', config.enemyPersonality),
            // M_FUN.QA.AIVAI — playerPersonality lets the balance
            // suite drive cross-personality matchups deterministically.
            // Omitted = registry default (the-diplomat).
            player: new AiPlayer('player', config.playerPersonality),
          }
        : {
            enemy: new AiPlayer(
              'enemy',
              typeof config === 'object' ? config.enemyPersonality : undefined,
            ),
          },
    assignAllPeonsToHarvest() {
      // M_FUN.QA.AIVAI.TUNE — faction-aware harvest with a base-
      // proximity bias. Previously every peon (player + enemy) was
      // assigned to the nearest GLOBAL node — enemy peons trekked
      // across the map to player wood and stayed SEEKING forever.
      // Score = distance from faction's base (primary) +
      // 0.1 * distance from peon (tie-break) so the chosen node
      // is anchored to the faction, not the peon's starting tile.
      const woodNodes = resourceNodes.filter((n) => n.resourceType === 'wood');
      if (woodNodes.length === 0 && resourceNodes.length === 0) return;
      const candidates = woodNodes.length > 0 ? woodNodes : resourceNodes;
      const anchors = {
        player: parseHexKey(townHallKey),
        enemy: parseHexKey(enemyBaseKey),
      };

      for (const entity of world.query(Unit, AssignedJob, HexPosition, FactionTrait)) {
        const unitComp = entity.get(Unit);
        if (unitComp?.unitType !== 'Peon') continue;
        const job = entity.get(AssignedJob);
        if (!job || job.state !== 'IDLE') continue;
        const hexPos = entity.get(HexPosition);
        if (!hexPos) continue;
        const faction = entity.get(FactionTrait)?.faction;
        if (!faction) continue;
        const anchor = anchors[faction];

        // Matches nearestResource() in src/rules/peon-rules.ts —
        // peon-distance + decaying base-bias past BIAS_RADIUS.
        // Centralising this in one shared helper would be cleaner;
        // for now both call sites use the same constants.
        const BASE_BIAS = 0.5;
        const BIAS_RADIUS = 6;
        let nearest: ResourceNodePlan | null = null;
        let nearestScore = Number.POSITIVE_INFINITY;
        for (const node of candidates) {
          const baseDist = hexDistance(anchor.q, anchor.r, node.q, node.r);
          const peonDist = hexDistance(hexPos.q, hexPos.r, node.q, node.r);
          const baseBias = BASE_BIAS * Math.max(0, baseDist - BIAS_RADIUS);
          const score = peonDist + baseBias;
          if (score < nearestScore) {
            nearestScore = score;
            nearest = node;
          }
        }
        if (nearest) {
          entity.set(AssignedJob, { state: 'SEEKING', targetKey: nearest.key });
        }
      }
    },
  };

  // Kick off the autonomous economy — peons begin harvesting immediately so a
  // fresh game's economic loop is self-running with no player input.
  game.assignAllPeonsToHarvest();

  return game;
}

/**
 * Run one game tick — advances every ECS system in the fixed order from
 * `docs/specs/50-ecs-model.md`: clock → command → terrain → combat → deposit
 * → scoring. Each phase is a named function in `economy-tick-phases.ts`
 * (M_FUN.REFACTOR.RUN-ECONOMY-TICK). Called once per rendered frame (or per
 * step in tests).
 */
export function runEconomyTick(game: GameState, deltaRaw: number): void {
  if (game.outcome !== 'playing') return;
  if (game.paused) return;
  // Reset the per-tick damage batch ONCE at tick start so the two combat
  // paths (offensive-behavior + combatSystem) can both APPEND.
  game.lastDamageEvents = [];
  // M_EXPANSION.U.111 — apply the gameSpeed multiplier.
  const delta = deltaRaw * (game.gameSpeed ?? 1);
  // M_MODES.8 — turn-based: drain the active turn's budget; when the budget
  // hits 0, auto-end the turn (flip active + reset budget). Simulation
  // continues to run during the turn — the budget is a wall-clock
  // pacing tool. endTurn() command flips the active mid-budget.
  if (game.turn) {
    game.turn.secondsRemaining -= delta;
    if (game.turn.secondsRemaining <= 0) {
      game.turn.active = game.turn.active === 'player' ? 'enemy' : 'player';
      game.turn.secondsRemaining = game.turn.turnLength;
      // M_TURNS.2 — count every full turn handoff (player→enemy or
      // enemy→player). Doubling-up the count on each handoff gives
      // a 'turns elapsed' = full cycles of both factions completed.
      game.turn.turnsElapsed += 1;
      // M_TURNS.2 — turn-cap victory: when the elapsed turns reach
      // the cap, flip outcome based on zone-control + score. Tie
      // goes to draw (game.outcome = 'draw' is rendered the same as
      // 'loss' UI today; future polish: dedicated draw screen).
      if (
        game.turn.maxTurns !== null &&
        game.turn.maxTurns > 0 &&
        game.turn.turnsElapsed >= game.turn.maxTurns
      ) {
        const playerZones = game.zones.player.controlled.size;
        const enemyZones = game.zones.enemy.controlled.size;
        const playerScore = (game.score?.player ?? 0) + playerZones * 10;
        const enemyScore = (game.score?.enemy ?? 0) + enemyZones * 10;
        if (playerScore > enemyScore) game.outcome = 'win';
        else if (enemyScore > playerScore) game.outcome = 'loss';
        else game.outcome = 'draw';
      }
    }
  }

  // M_TURNS.1 — true turn-based gate. Real-time modes (no game.turn) ALWAYS pass.
  const turnGateOpen = !game.turn || game.turn.active === 'enemy';

  // Phase 1: Clock — advance time, weather, random events, autosave.
  // Always ticks; wall-clock visuals must not freeze with the sim.
  tickClockPhase(game, delta);

  // Phase 2: Command — AI decisions, spawning, stance + pathFollow.
  tickCommandPhase(game, delta, turnGateOpen);

  // Phase 3: Terrain — status attributes, volcano, wildfire, quake-decay,
  // hidden-bonus, encroachment, job-routing, harvest, build, science.
  tickTerrainPhase(game, delta, turnGateOpen);

  // Phase 4: Combat — offensive behavior, vision, supply, combat, projectiles.
  tickCombatPhase(game, delta, turnGateOpen, PROJECTILE_ID_REF);

  // Phase 5: Deposit — resource events, peon metrics.
  tickDepositPhase(game);

  // Phase 6: Scoring — death, building-death, animation, wonder, win-loss, score.
  tickScoringPhase(game, delta);
}
