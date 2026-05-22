/**
 * src/ai — public surface of the yuka-backed AI subpackage.
 *
 * The single export that external code (game-state.ts, tests) needs is
 * `aiSystem`. It keeps the exact signature of the old `src/ecs/systems/ai.ts`
 * function so no callers change.
 *
 * `AiDirector` is also exported for tests that need to inspect Vehicle state.
 */
import type { World } from 'koota';
import type { BoardData } from '@/core/board';
import type { NavGraph } from '@/core/pathfinding';
import { AiDirector } from './ai-director';

/** Module-level singleton director (one per app lifecycle). */
const director = new AiDirector();

/**
 * Enemy AI system — drop-in replacement for the old `src/ecs/systems/ai.ts`
 * export. Delegates to the yuka `AiDirector`.
 *
 * Signature is intentionally unchanged so `runEconomyTick` in game-state.ts
 * requires zero modification.
 *
 * @param world  - The koota ECS world.
 * @param board  - Board data (level look-up for PathQueue steps).
 * @param graph  - Pre-built A* navigation graph.
 */
export function aiSystem(world: World, board: BoardData, graph: NavGraph): void {
  // Use a fixed 1/60 delta when called without an explicit delta (legacy call
  // sites in game-state pass only the three positional args). The economy tick
  // passes its own `delta`; the director receives it here via the closure so
  // that callers don't need to update their call site.
  director.tick(world, board, graph, 1 / 60);
}

export { AiDirector } from './ai-director';
export { MAX_RETARGETS_PER_TICK } from './perception';
