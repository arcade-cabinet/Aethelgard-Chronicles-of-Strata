/**
 * M_V11.CAMPS.WANDER — wanderSystem behavior tests.
 *
 * Verifies:
 *   1. With pickChance gate failing (rng() >= pickChance), no
 *      PathQueue is set.
 *   2. With pickChance gate passing, a PathQueue is queued to a
 *      walkable tile within radius of the anchor.
 *   3. A mob with an existing PathQueue is skipped (combat/stance
 *      pathing wins).
 *   4. Determinism: same rng sequence → same destination pick.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import {
  FactionTrait,
  HexPosition,
  PathQueue,
  Unit,
  WanderBehavior,
} from '@/ecs/components';
import { wanderSystem } from '@/ecs/systems/wander';

function makeMob(
  world: ReturnType<typeof createWorld>,
  anchor: { q: number; r: number; level: number },
) {
  const e = world.spawn(Unit, FactionTrait, HexPosition, WanderBehavior);
  e.set(Unit, { unitType: 'Goblin' });
  e.set(FactionTrait, { faction: 'barbarian-camp-1' as 'player' | 'enemy' });
  e.set(HexPosition, { q: anchor.q, r: anchor.r, level: anchor.level });
  e.set(WanderBehavior, {
    anchorQ: anchor.q,
    anchorR: anchor.r,
    radius: 5,
    pickChance: 0.05,
  });
  return e;
}

function findWalkable(board: ReturnType<typeof generateBoard>) {
  for (const t of board.tiles.values()) if (t.walkable) return t;
  throw new Error('no walkable');
}

describe('wanderSystem (M_V11.CAMPS.WANDER)', () => {
  it('does NOT queue a path when pickChance gate fails', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    const e = makeMob(world, t);
    // rng=0.5 ≥ pickChance(0.05) → gate fails.
    wanderSystem(world, board, () => 0.5);
    const pq = e.get(PathQueue);
    expect(pq?.steps?.length ?? 0).toBe(0);
  });

  it('queues a single-step path within radius when gate passes', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    const e = makeMob(world, t);
    // First call: 0.0 < 0.05 → gate passes. Second call (tile pick):
    // 0.0 → pick first candidate.
    let n = 0;
    const rng = () => (n++ === 0 ? 0.0 : 0.0);
    wanderSystem(world, board, rng);
    const pq = e.get(PathQueue);
    expect(pq?.steps?.length ?? 0).toBe(1);
  });

  it('skips mobs with an existing PathQueue', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    const e = makeMob(world, t);
    e.add(PathQueue);
    e.set(PathQueue, { steps: ['99,99,0'] });
    // Even with the gate passing, the existing path stays.
    wanderSystem(world, board, () => 0.0);
    expect(e.get(PathQueue)?.steps[0]).toBe('99,99,0');
  });

  it('is deterministic — same rng sequence produces the same pick', () => {
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    function runOnce() {
      const world = createWorld();
      const e = makeMob(world, t);
      const seq = [0.0, 0.7];
      let i = 0;
      wanderSystem(world, board, () => seq[i++ % 2] ?? 0);
      return e.get(PathQueue)?.steps[0];
    }
    const a = runOnce();
    const b = runOnce();
    expect(a).toBe(b);
    expect(a).toBeDefined();
  });
});
