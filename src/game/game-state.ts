import type { Entity, World } from 'koota';
import { type BoardData, generateBoard } from '@/core/board';
import { getHexKey, hexDistance } from '@/core/hex';
import { type NavGraph, buildNavGraph } from '@/core/pathfinding';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';
import { AssignedJob, HexPosition, ResourceTrait, Unit } from '@/ecs/components';
import { animationSystem } from '@/ecs/systems/animation';
import { buildSystem } from '@/ecs/systems/build';
import { depositSystem } from '@/ecs/systems/deposit';
import { harvestSystem } from '@/ecs/systems/harvest';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { type GameEconomy, createEconomy } from './economy';
import { type ResourceNodePlan, spawnResourceNodes } from '@/world/resource-spawn';
import { createDualPrng } from '@/core/rng';

/** The live state of one play session. */
export interface GameState {
  /** The seed phrase the session was started with. */
  seedPhrase: string;
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

/** Find a walkable tile adjacent to the given tile, falling back to the tile itself. */
function findAdjacentWalkable(
  board: BoardData,
  q: number,
  r: number,
): { q: number; r: number; level: number } {
  const dirs = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ];
  for (const d of dirs) {
    const tile = board.tiles.get(getHexKey(q + d.q, r + d.r));
    if (tile?.walkable) return { q: q + d.q, r: r + d.r, level: tile.level };
  }
  // fallback to the same tile if walkable
  const fallback = board.tiles.get(getHexKey(q, r));
  return { q, r, level: fallback?.level ?? 0 };
}

/**
 * Start a new game from a seed phrase. Generates the board, builds the nav
 * graph, creates the ECS world, spawns the player pawn, spawns resource nodes,
 * and places the Town Hall on the most central walkable tile.
 */
export function startGame(seedPhrase: string): GameState {
  const board = generateBoard(seedPhrase);
  const navGraph = buildNavGraph(board);
  const world = createEcsWorld();

  const spawn = findCentralWalkableTile(board);
  const townHallKey = getHexKey(spawn.q, spawn.r);
  const economy = createEconomy();

  // spawn the primary player pawn at the Town Hall tile
  const playerPawn = createCharacter({
    world,
    role: 'Peon',
    q: spawn.q,
    r: spawn.r,
    level: spawn.level,
    selected: true,
  });

  // spawn a second peon adjacent to the Town Hall
  const secondSpawn = findAdjacentWalkable(board, spawn.q, spawn.r);
  createCharacter({
    world,
    role: 'Peon',
    q: secondSpawn.q,
    r: secondSpawn.r,
    level: secondSpawn.level,
    selected: false,
  });

  // spawn resource nodes using the map PRNG
  const { map } = createDualPrng(seedPhrase);
  const resourceNodes = spawnResourceNodes(board, map);
  for (const plan of resourceNodes) {
    world.spawn(
      HexPosition({ q: plan.q, r: plan.r, level: plan.level }),
      ResourceTrait({ resourceType: plan.resourceType, amount: plan.amount }),
    );
  }

  const buildSites = new Map<string, Entity>();

  const game: GameState = {
    seedPhrase,
    board,
    navGraph,
    world,
    playerPawn,
    economy,
    townHallKey,
    resourceNodes,
    buildSites,
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

  return game;
}

/**
 * Run one economy tick — advances all ECS systems in the fixed order defined
 * by `docs/specs/50-ecs-model.md`. Called once per rendered frame (or once per
 * simulation step in tests).
 */
export function runEconomyTick(game: GameState, delta: number): void {
  pathFollowSystem(game.world, delta);
  jobRoutingSystem(game.world, game.board, game.navGraph, game.townHallKey);
  harvestSystem(game.world, delta);
  depositSystem(game.world, game.economy, game.townHallKey);
  buildSystem(game.world, game.buildSites, delta);
  animationSystem(game.world);
}
