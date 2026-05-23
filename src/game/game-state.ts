import type { Entity, World } from 'koota';
import { AiPlayer } from '@/ai/ai-player';
import { BALANCE_TOLERANCE, isBalanced, reachableBuildableCount } from '@/core/balance-audit';
import { type BoardData, generateBoard } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { buildNavGraph, type NavGraph } from '@/core/pathfinding';
import {
  AssignedJob,
  AttractorBehavior,
  Building,
  type BuildingType,
  EnemySpawner,
  FactionBase,
  FactionTrait,
  Health,
  HexPosition,
  ResourceTrait,
  Unit,
} from '@/ecs/components';
import { aiSystem, resetAiDirector } from '@/ecs/systems/ai';
import { animationSystem } from '@/ecs/systems/animation';
import { buildSystem } from '@/ecs/systems/build';
import { buildingDeathSystem } from '@/ecs/systems/building-death';
import { combatSystem, type DamageEvent } from '@/ecs/systems/combat';
import { deathSystem } from '@/ecs/systems/death';
import { depositSystem, type ResourceDepositEvent } from '@/ecs/systems/deposit';
import { encroachmentSystem } from '@/ecs/systems/encroachment';
import { harvestSystem } from '@/ecs/systems/harvest';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { offensiveBehaviorSystem } from '@/ecs/systems/offensive-behavior';
import { scienceSystem } from '@/ecs/systems/science';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';
import { advanceProjectiles, type Projectile } from './projectiles';

/** Monotonic counter for projectile React keys — shared across all games. */
const projectileIdRef = { current: 0 };

/**
 * Match-length scaling for spawn cadence (M_MODES.5). Slower matches let the
 * player breathe; short matches keep pressure on. Identity for 'medium' so
 * existing tuning baselines stay intact.
 */
function matchLengthScale(length: 'short' | 'medium' | 'long' | 'endless'): number {
  switch (length) {
    case 'short':
      return 0.7;
    case 'medium':
      return 1;
    case 'long':
      return 1.4;
    case 'endless':
      return 1.6;
  }
}

/**
 * M_MAPGEN.10 — try the seed + a few variants and return the first that
 * passes the balance audit. We assume the most-central walkable tile is
 * the player center + the farthest-walkable tile is the enemy center
 * (the same heuristic startGame uses). Caps at MAX_ATTEMPTS so a
 * pathological seed doesn't hang. Falls back to the last attempted board.
 */
const MAX_BALANCE_ATTEMPTS = 6;

function findBalancedBoard(
  seedPhrase: string,
  mapSize: number,
  mapType: 'balanced' | 'continent' | 'archipelago' | 'dry-land',
): BoardData {
  let last: BoardData | null = null;
  for (let attempt = 0; attempt < MAX_BALANCE_ATTEMPTS; attempt++) {
    const seed = attempt === 0 ? seedPhrase : `${seedPhrase}-rb${attempt}`;
    const board = generateBoard(seed, mapSize, true, mapType);
    last = board;
    // pick centers by the same heuristic startGame uses below
    let centerTile: { q: number; r: number } | null = null;
    let centerDist = Infinity;
    let edgeTile: { q: number; r: number } | null = null;
    let edgeDist = 0;
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      const d = (Math.abs(tile.q) + Math.abs(tile.r) + Math.abs(tile.q + tile.r)) / 2;
      if (d < centerDist) {
        centerDist = d;
        centerTile = { q: tile.q, r: tile.r };
      }
      if (d > edgeDist) {
        edgeDist = d;
        edgeTile = { q: tile.q, r: tile.r };
      }
    }
    if (!centerTile || !edgeTile) continue;
    if (isBalanced(board, centerTile, edgeTile)) return board;
  }
  return last ?? generateBoard(seedPhrase, mapSize, true, mapType);
}

// M_AUDIT2.ARCH.8 — AI_VISION_RADIUS moved into config/combat.json
// (COMBAT.ai.visionRadiusByDifficulty); accessor `aiVisionRadiusFor`.
// The const lived here for one consumer; moving it to config keeps
// every difficulty-tuning knob in one tunable file.

import { aiVisionRadiusFor, spawnIntervalFor } from '@/config/combat';
import { MAP_RADIUS } from '@/config/world';
import { createEventPrng, createMapPrng } from '@/core/rng';
import { FACTIONS, type Faction } from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { spawnSystem } from '@/ecs/systems/spawn';
import { evaluateWinLoss, type GameOutcome } from '@/ecs/systems/win-loss';
import { behaviorsFor, ensureAttractorResources, presetFor, recomputeMaxSupply } from '@/rules';
import { type ResourceNodePlan, spawnResourceNodes } from '@/world/resource-spawn';
import type { AutoSave } from './auto-save';
import { tickAutoSave } from './auto-save';
import { advanceClock, createClock, type GameClock } from './clock';
import type { Difficulty } from './difficulty';
import { createEconomy, type GameEconomy } from './economy';
import { createRally, type RallyState } from './rally';
import { createResearch, type ResearchState } from './research';
import { advanceWeather, createWeather, WEATHER_SPEED_MULTIPLIER, type Weather } from './weather';
import { createZoneState, seedZonesFromAttractors, updateObserved, type ZoneState } from './zone';

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
   * Game mode preset (M_MODES.1). Drives default mapSize / matchLength /
   * turnsMode / mapType / win-condition rules. Defaults to 'red-vs-blue'
   * when omitted so existing call sites keep current behaviour.
   *   red-vs-blue: balanced 2-base RTS — the M_MAPGEN guided generation.
   *   skirmish:    pure-noise map; may be asymmetric.
   *   endless:     TownHalls invulnerable; resign/starve outcome only.
   *   classic-rts: longer match + scaled Discoveries progression.
   *   4x:          eXplore/eXpand/eXploit/eXterminate — multi-base, Wonder race.
   */
  mode?: GameMode;
}

/** The 5 selectable game-mode presets (M_MODES). */
export type GameMode = 'red-vs-blue' | 'skirmish' | 'endless' | 'classic-rts' | '4x';

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
  /** The selected game-mode preset (M_MODES). Defaults to red-vs-blue. */
  mode: GameMode;
  /** The generated board. */
  board: BoardData;
  /** The A* navigation graph. */
  navGraph: NavGraph;
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
  };
  /**
   * Goal-driven AI players, keyed by faction. The enemy faction always has one;
   * the player faction gets one only in AI-vs-AI mode (M8.7 E2E harness).
   */
  aiPlayers: Partial<Record<Faction, AiPlayer>>;
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

  // Spawn the player home base (the Town Hall — loss condition when destroyed).
  // Town Hall composes AttractorBehavior (spec 102) — radius drives the
  // map-gen guarantee AND the initial zone-of-control footprint.
  const townHallProfile = behaviorsFor('TownHall');
  const townHallEntity = world.spawn(
    HexPosition({ q: center.q, r: center.r, level: center.level }),
    Building({ buildingType: 'TownHall', isComplete: true, progress: 1 }),
    Health({ current: 500, max: 500 }),
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
    Health({ current: 300, max: 300 }),
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
    mode: mode ?? 'red-vs-blue',
    board,
    navGraph,
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
    research: createResearch(),
    rally: createRally(),
    zones: seedZonesFromAttractors({ player: createZoneState(), enemy: createZoneState() }, board, {
      player: center,
      enemy: enemyBaseTile,
    }),
    score: { player: 0, enemy: 0 },
    // M_MODES.8 — turn-based superposition (4x default; others opt-in via
    // the Advanced toggle). 60s turns; player starts.
    ...(preset.turnsMode === 'turn-based'
      ? { turn: { active: 'player' as Faction, secondsRemaining: 60, turnLength: 60 } }
      : {}),
    // the enemy faction always runs a yuka AI player; AI-vs-AI mode swaps in
    // the player faction's via the test harness (M8.7).
    aiPlayers: { enemy: new AiPlayer('enemy') },
    assignAllPeonsToHarvest() {
      // find the first wood node (fallback to any node)
      const woodNodes = resourceNodes.filter((n) => n.resourceType === 'wood');
      if (woodNodes.length === 0 && resourceNodes.length === 0) return;

      // query all peons with AssignedJob
      for (const entity of world.query(Unit, AssignedJob, HexPosition)) {
        const unitComp = entity.get(Unit);
        if (unitComp?.unitType !== 'Peon') continue;
        const job = entity.get(AssignedJob);
        if (!job || job.state !== 'IDLE') continue;
        const hexPos = entity.get(HexPosition);
        if (!hexPos) continue;

        // find the nearest resource node by hexDistance
        let nearest: ResourceNodePlan | null = null;
        let nearestDist = Number.POSITIVE_INFINITY;
        const candidates = woodNodes.length > 0 ? woodNodes : resourceNodes;
        for (const node of candidates) {
          const d = hexDistance(hexPos.q, hexPos.r, node.q, node.r);
          if (d < nearestDist) {
            nearestDist = d;
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
 * `docs/specs/50-ecs-model.md`: spawn → ai → pathFollow → jobRouting → harvest
 * → build → combat → deposit → death → animation → winLoss. Build runs before
 * deposit (system #7 before #9) so a freshly-assigned builder advances the same
 * tick. Called once per rendered frame (or per step in tests).
 */
export function runEconomyTick(game: GameState, delta: number): void {
  // Skip all ticks once the game has ended.
  if (game.outcome !== 'playing') return;
  // M_GAMEPLAY.7 — pause flag freezes the simulation; rendering continues.
  if (game.paused) return;
  // M_MODES.8 — turn-based: drain the active turn's budget; when the budget
  // hits 0, auto-end the turn (flip active + reset budget). Simulation
  // continues to run during the turn — the budget is a wall-clock
  // pacing tool. endTurn() command flips the active mid-budget.
  if (game.turn) {
    game.turn.secondsRemaining -= delta;
    if (game.turn.secondsRemaining <= 0) {
      game.turn.active = game.turn.active === 'player' ? 'enemy' : 'player';
      game.turn.secondsRemaining = game.turn.turnLength;
    }
  }

  // advance time-based systems
  advanceClock(game.clock, delta);
  advanceWeather(game.weather, game.eventRng, delta);
  if (game.autoSave) tickAutoSave(game.autoSave, delta);

  // goal-driven AI players decide + issue commands on their own cadence
  for (const ai of Object.values(game.aiPlayers)) ai?.tick(game, delta);

  // enemy spawning + AI unit-steering target selection
  spawnSystem(game.world, game.board, delta, game.clock.elapsed, game.difficulty);
  aiSystem(game.world, game.board, game.navGraph);

  // movement + economy — apply rain speed penalty from weather state
  pathFollowSystem(game.world, delta, WEATHER_SPEED_MULTIPLIER[game.weather.state]);
  // encroachment runs BEFORE peon routing so peons see this tick's pulse set
  // (their decision rule routes them away from threatened tiles).
  encroachmentSystem(game.world, game.zones, delta, game.difficulty);
  jobRoutingSystem({
    world: game.world,
    board: game.board,
    graph: game.navGraph,
    baseKeys: { player: game.townHallKey, enemy: game.enemyBaseKey },
    zones: game.zones,
  });
  harvestSystem(game.world, delta);
  buildSystem(game.world, game.buildSites, delta);
  // M_FEATURE.3 — passive trickle + per-Library science accumulation.
  scienceSystem(game.world, game.economy, delta);
  // Every offensive-behaviour entity (Watchtower today; future Wonder etc.)
  // damages enemy military in its radius — decoupled from building type.
  // Also emits visible projectile FX (cadence-gated; presentation only).
  offensiveBehaviorSystem(
    game.world,
    delta,
    game.eventRng,
    game.projectiles,
    game.projectileCooldowns,
    projectileIdRef,
  );
  // advance + cull projectile FX
  advanceProjectiles(game.projectiles, delta);

  // recompute each faction's observed battlefield from current unit/base cones
  // M_AI_DEPTH.1 — difficulty-scaled vision cones for the AI faction.
  // Easy = narrow short cones (AI sees less); Hard = wide cones. The player
  // always uses the base radius. The AI never "cheats" — it just literally
  // sees more or less of the board based on difficulty.
  const aiVision = aiVisionRadiusFor(game.difficulty);
  updateObserved(game.zones.player, game.world, 'player', game.board.tiles.values());
  updateObserved(game.zones.enemy, game.world, 'enemy', game.board.tiles.values(), aiVision);

  // recompute each faction's supply cap from its own complete buildings —
  // a finished Farm raises that faction's max supply.
  const completeByFaction: Record<Faction, BuildingType[]> = { player: [], enemy: [] };
  for (const e of game.world.query(Building, FactionTrait)) {
    const b = e.get(Building);
    const faction = e.get(FactionTrait)?.faction;
    if (b?.isComplete && faction) completeByFaction[faction].push(b.buildingType);
  }
  recomputeMaxSupply(game.economy.player, completeByFaction.player);
  recomputeMaxSupply(game.economy.enemy, completeByFaction.enemy);

  // combat
  game.lastDamageEvents = combatSystem(game.world, game.eventRng, delta);

  // M_MODES.4 — endless mode: FactionBases are invulnerable. Clamp each
  // base entity's Health back to max after combat applies damage. Spec:
  // win condition swaps to resign/starve (handled in evaluateWinLoss
  // when matchLength === 'endless'; future M_MODES.4 follow-up).
  if (presetFor(game.mode).invulnerableBases) {
    for (const e of game.world.query(FactionBase, Health)) {
      const h = e.get(Health);
      if (h && h.current < h.max) e.set(Health, { ...h, current: h.max });
    }
  }

  // resource deposit — each faction's carrying peons deposit at their own base.
  // M_REGISTRY.16: iterate FACTIONS instead of hand-unrolling player+enemy.
  // Reviewer follow-up: avoid the per-tick `baseKeyForFaction` allocation;
  // baseKeyFor() reads the stable game-state fields directly.
  const resourceEvents: ResourceDepositEvent[] = [];
  for (const f of FACTIONS) {
    depositSystem(game.world, game.economy[f], baseKeyFor(game, f), f, resourceEvents);
  }
  game.lastResourceEvents = resourceEvents;

  // death resolution — deathSystem returns the enemies removed this tick;
  // a removed enemy is a player kill.
  game.economy.player.kills += deathSystem(game.world, delta);

  // building destruction — 0-HP buildings (excluding FactionBase, which is
  // the win/loss anchor) are removed; tile walkability + nav graph rebuild.
  const newNavGraph = buildingDeathSystem(game.world, game.buildSites, game.board);
  if (newNavGraph) {
    game.navGraph = newNavGraph;
    // M_AUDIT2.ARCH.22 — newNavGraph != null implies anyRemoved == true;
    // bump the generation counter so renderer memos invalidate.
    game.buildSitesGeneration += 1;
  }

  // animation state + end-condition check
  animationSystem(game.world);
  game.outcome = evaluateWinLoss(game.world, game.outcome);

  // M_MODES.10 — controlled-tile-time score integral. Track area under the
  // territory curve for each faction; rendered in GameOverModal. Even in
  // non-endless modes this is a useful match summary.
  game.score.player += game.zones.player.controlled.size * delta;
  game.score.enemy += game.zones.enemy.controlled.size * delta;
}
