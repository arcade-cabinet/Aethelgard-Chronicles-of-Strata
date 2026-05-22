import type { Entity, World } from 'koota';
import { type BoardData, generateBoard } from '@/core/board';
import { hexDistance } from '@/core/hex';
import { type NavGraph, buildNavGraph } from '@/core/pathfinding';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';

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
    const dist = hexDistance(tile.q, tile.r, 0, 0);
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
  const playerPawn = createCharacter({
    world,
    role: 'Peon',
    q: spawn.q,
    r: spawn.r,
    level: spawn.level,
    selected: true,
  });

  return { seedPhrase, board, navGraph, world, playerPawn };
}
