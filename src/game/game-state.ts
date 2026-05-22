import type { Entity, World } from 'koota';
import { type BoardData, generateBoard } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { type NavGraph, buildNavGraph } from '@/core/pathfinding';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';
import {
  AssignedJob,
  Building,
  type BuildingType,
  FactionTrait,
  GoblinPortalTrait,
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
import { depositSystem } from '@/ecs/systems/deposit';
import { harvestSystem } from '@/ecs/systems/harvest';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { spawnSystem } from '@/ecs/systems/spawn';
import { type GameOutcome, evaluateWinLoss } from '@/ecs/systems/win-loss';
import { type GameEconomy, createEconomy } from './economy';
import { recomputeMaxSupply } from './supply';
import { type ResourceNodePlan, spawnResourceNodes } from '@/world/resource-spawn';
import { createEventPrng, createMapPrng } from '@/core/rng';
import { MAP_RADIUS } from '@/config/world';
import { type GameClock, advanceClock, createClock } from './clock';
import { type Weather, WEATHER_SPEED_MULTIPLIER, advanceWeather, createWeather } from './weather';
import { type ResearchState, createResearch } from './research';
import { type RallyState, createRally } from './rally';
import type { AutoSave } from './auto-save';
import { tickAutoSave } from './auto-save';
import { spawnIntervalFor } from '@/config/combat';
import type { Difficulty } from './difficulty';

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
  /** Global resource totals and supply. */
  economy: GameEconomy;
  /** The hex key of the Town Hall tile. */
  townHallKey: string;
  /** All planned resource node placements for this session. */
  resourceNodes: ResourceNodePlan[];
  /** Building-site entities keyed by hex tile key (for the build system). */
  buildSites: Map<string, Entity>;
  /** The Town Hall ECS entity (player base — loss condition). */
  townHallEntity: Entity;
  /** The Goblin Portal ECS entity (enemy spawner — win condition). */
  portalEntity: Entity;
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
  /**
   * The koota entityId of the currently-selected entity, or `undefined` when
   * nothing is selected. Updated by `selectEntity` in `@/game/selection`.
   */
  selectedId?: number;
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
  const economy = createEconomy();

  // Mark the Town Hall tile unwalkable BEFORE building the nav graph — units
  // path around the building and deposit from an adjacent tile.
  const townHallTile = board.tiles.get(townHallKey);
  if (townHallTile) townHallTile.walkable = false;
  const navGraph = buildNavGraph(board);

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

  // Spawn the Town Hall entity (player base — loss condition).
  const townHallEntity = world.spawn(
    HexPosition({ q: center.q, r: center.r, level: center.level }),
    Building({ buildingType: 'TownHall', isComplete: true, progress: 1 }),
    Health({ current: 500, max: 500 }),
    FactionTrait({ faction: 'player' }),
  );

  // Pick the farthest walkable tile from center for the Goblin Portal.
  let portalTile = center;
  let maxDist = 0;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const d = hexDistance(tile.q, tile.r, center.q, center.r);
    if (d > maxDist) {
      maxDist = d;
      portalTile = tile;
    }
  }

  // Spawn the Goblin Portal entity (enemy spawner — win condition).
  // spawnInterval is difficulty-scaled: easy 60s, normal 45s, hard 30s.
  const portalEntity = world.spawn(
    HexPosition({ q: portalTile.q, r: portalTile.r, level: portalTile.level }),
    GoblinPortalTrait({ spawnTimer: 0, spawnInterval: spawnIntervalFor(difficulty) }),
    Health({ current: 300, max: 300 }),
    FactionTrait({ faction: 'enemy' }),
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
  const resourceNodes = spawnResourceNodes(board, mapRng);
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
    resourceNodes,
    buildSites,
    townHallEntity,
    portalEntity,
    outcome: 'playing',
    lastDamageEvents: [],
    eventRng,
    clock: createClock(),
    weather: createWeather(),
    research: createResearch(),
    rally: createRally(),
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

  // advance time-based systems
  advanceClock(game.clock, delta);
  advanceWeather(game.weather, game.eventRng, delta);
  if (game.autoSave) tickAutoSave(game.autoSave, delta);

  // enemy spawning + AI target selection
  spawnSystem(game.world, game.board, delta, game.clock.elapsed, game.difficulty);
  aiSystem(game.world, game.board, game.navGraph);

  // movement + economy — apply rain speed penalty from weather state
  pathFollowSystem(game.world, delta, WEATHER_SPEED_MULTIPLIER[game.weather.state]);
  jobRoutingSystem(game.world, game.board, game.navGraph, game.townHallKey);
  harvestSystem(game.world, delta);
  buildSystem(game.world, game.buildSites, delta);

  // recompute the supply cap from all complete buildings — a finished Farm
  // raises max supply.
  const completeBuildings: BuildingType[] = [];
  for (const e of game.world.query(Building)) {
    const b = e.get(Building);
    if (b?.isComplete) completeBuildings.push(b.buildingType);
  }
  recomputeMaxSupply(game.economy, completeBuildings);

  // combat
  game.lastDamageEvents = combatSystem(game.world, game.eventRng, delta);

  // resource deposit
  depositSystem(game.world, game.economy, game.townHallKey);

  // death resolution — deathSystem returns the enemies removed this tick
  game.economy.kills += deathSystem(game.world, delta);

  // animation state + end-condition check
  animationSystem(game.world);
  game.outcome = evaluateWinLoss(game.world);
}
