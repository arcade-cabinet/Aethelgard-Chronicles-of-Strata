import type { Entity, World } from 'koota';
import { type BoardData, generateBoard } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { type NavGraph, buildNavGraph } from '@/core/pathfinding';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';
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
import { animationSystem } from '@/ecs/systems/animation';
import { aiSystem } from '@/ecs/systems/ai';
import { buildSystem } from '@/ecs/systems/build';
import { type DamageEvent, combatSystem } from '@/ecs/systems/combat';
import { deathSystem } from '@/ecs/systems/death';
import { buildingDeathSystem } from '@/ecs/systems/building-death';
import { type ResourceDepositEvent, depositSystem } from '@/ecs/systems/deposit';
import { harvestSystem } from '@/ecs/systems/harvest';
import { AiPlayer } from '@/ai/ai-player';
import { encroachmentSystem } from '@/ecs/systems/encroachment';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { offensiveBehaviorSystem } from '@/ecs/systems/offensive-behavior';
import { type Projectile, advanceProjectiles } from './projectiles';

/** Monotonic counter for projectile React keys — shared across all games. */
const projectileIdRef = { current: 0 };

/**
 * AI vision-cone radius per difficulty (M_AI_DEPTH.1). The AI faction sees
 * less on Easy (narrower cones — slower to react to incursions) and more on
 * Hard (wider cones — spots the player's army from farther away). Player
 * vision is always the base radius (5). The AI never cheats — it just
 * literally observes less or more of the board.
 */
const AI_VISION_RADIUS: Record<Difficulty, number> = {
  easy: 3,
  normal: 5,
  hard: 8,
};
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { spawnSystem } from '@/ecs/systems/spawn';
import { type GameOutcome, evaluateWinLoss } from '@/ecs/systems/win-loss';
import { type GameEconomy, createEconomy } from './economy';
import { behaviorsFor, recomputeMaxSupply } from '@/rules';
import { type ResourceNodePlan, spawnResourceNodes } from '@/world/resource-spawn';
import { ensureAttractorResources } from '@/rules';
import { createEventPrng, createMapPrng } from '@/core/rng';
import { MAP_RADIUS } from '@/config/world';
import { type GameClock, advanceClock, createClock } from './clock';
import { type Weather, WEATHER_SPEED_MULTIPLIER, advanceWeather, createWeather } from './weather';
import { type ResearchState, createResearch } from './research';
import { type RallyState, createRally } from './rally';
import type { AutoSave } from './auto-save';
import { tickAutoSave } from './auto-save';
import { type ZoneState, createZoneState, updateObserved } from './zone';
import { spawnIntervalFor } from '@/config/combat';
import type { Difficulty } from './difficulty';
import type { Faction } from '@/ecs/components';

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
}

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

  const { seedPhrase, mapSize, difficulty, eventSeed } = config;

  const board = generateBoard(seedPhrase, mapSize);
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

  // Pick the farthest walkable tile from center for the enemy base.
  let enemyBaseTile = center;
  let maxDist = 0;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const d = hexDistance(tile.q, tile.r, center.q, center.r);
    if (d > maxDist) {
      maxDist = d;
      enemyBaseTile = tile;
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
    EnemySpawner({ spawnTimer: 0, spawnInterval: spawnIntervalFor(difficulty) }),
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
  let resourceNodes = spawnResourceNodes(board, mapRng);
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
    board,
    navGraph,
    world,
    playerPawn,
    economy,
    townHallKey,
    enemyBaseKey,
    resourceNodes,
    buildSites,
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
    zones: { player: createZoneState(), enemy: createZoneState() },
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
  const aiVision = AI_VISION_RADIUS[game.difficulty];
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

  // resource deposit — each faction's carrying peons deposit at their own base
  // fresh batch each tick — render layer detects new events by array-reference
  const resourceEvents: ResourceDepositEvent[] = [];
  depositSystem(game.world, game.economy.player, game.townHallKey, 'player', resourceEvents);
  depositSystem(game.world, game.economy.enemy, game.enemyBaseKey, 'enemy', resourceEvents);
  game.lastResourceEvents = resourceEvents;

  // death resolution — deathSystem returns the enemies removed this tick;
  // a removed enemy is a player kill.
  game.economy.player.kills += deathSystem(game.world, delta);

  // building destruction — 0-HP buildings (excluding FactionBase, which is
  // the win/loss anchor) are removed; tile walkability + nav graph rebuild.
  const newNavGraph = buildingDeathSystem(game.world, game.buildSites, game.board);
  if (newNavGraph) game.navGraph = newNavGraph;

  // animation state + end-condition check
  animationSystem(game.world);
  game.outcome = evaluateWinLoss(game.world);
}
