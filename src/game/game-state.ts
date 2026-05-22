import type { Entity, World } from 'koota';
import { type BoardData, generateBoard } from '@/core/board';
import { TILE_HEIGHT } from '@/core/constants';
import { axialToWorld } from '@/core/hex';
import { type NavGraph, buildNavGraph } from '@/core/pathfinding';
import { HexPosition, Movement, PathQueue, Selectable, Transform, Unit } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';

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
}

/** Find the walkable tile closest to the board centre — the pawn spawn. */
function findCentralWalkableTile(board: BoardData): { q: number; r: number; level: number } {
  let best: { q: number; r: number; level: number } | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const tile of board.tiles.values()) {
    if (!tile.walkable) continue;
    const dist = Math.abs(tile.q) + Math.abs(tile.r);
    if (dist < bestDist) {
      bestDist = dist;
      best = { q: tile.q, r: tile.r, level: tile.level };
    }
  }
  if (!best) throw new Error('Board has no walkable tile — cannot spawn the player pawn');
  return best;
}

/**
 * Start a new game from a seed phrase. Generates the board, builds the nav
 * graph, creates the ECS world, and spawns the player pawn on the most central
 * walkable tile. This is the entry point the launcher calls on "Enter Realm".
 */
export function startGame(seedPhrase: string): GameState {
  const board = generateBoard(seedPhrase);
  const navGraph = buildNavGraph(board);
  const world = createEcsWorld();

  const spawn = findCentralWalkableTile(board);
  const spawnWorld = axialToWorld(spawn.q, spawn.r);
  const playerPawn = world.spawn(
    HexPosition({ q: spawn.q, r: spawn.r, level: spawn.level }),
    Transform({ x: spawnWorld.x, y: spawn.level * TILE_HEIGHT, z: spawnWorld.z, rotationY: 0 }),
    Unit({ unitType: 'Peon' }),
    Movement({ speed: 3, isMoving: false }),
    PathQueue({ steps: [] }),
    Selectable({ isSelected: true }),
  );

  return { seedPhrase, board, navGraph, world, playerPawn };
}
