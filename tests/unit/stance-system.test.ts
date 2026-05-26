/**
 * Stance system tests (M_POLISH2.RTS.16).
 *
 * Six scenarios covering every stance mode:
 *  1. aggressive — chases a distant enemy (within AGGRESSIVE_CHASE_RADIUS).
 *  2. aggressive — does NOT chase an enemy beyond the chase radius.
 *  3. defensive  — engages a nearby threat within the engage radius.
 *  4. defensive  — returns home (queues a path) when no enemy is nearby.
 *  5. hold-position — never moves; acquires adjacent target, ignores distant.
 *  6. stand-ground — acquires in-range target but does NOT queue a path.
 *
 * All worlds are headless — no Three.js, no NavGraph. The graph stubs here
 * produce a straight A* path for adjacent tiles so PathQueue writes can be
 * asserted without a real board.
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import type { NavGraph } from '@/core/pathfinding';
import {
  Combatant,
  CommandedTile,
  EnemyTarget,
  FactionTrait,
  Health,
  HexPosition,
  PathQueue,
  Stance,
  type StanceMode,
  Unit,
} from '@/ecs/components';
import { stanceBehaviorSystem } from '@/ecs/systems/stance-behavior';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal NavGraph — NavGraph is `Map<string, Set<string>>` (src/core/pathfinding.ts).
 * `paths` maps each tile key to its reachable neighbors.
 */
function stubGraph(paths: Record<string, string[]>): NavGraph {
  const g: NavGraph = new Map();
  for (const [from, tos] of Object.entries(paths)) {
    g.set(from, new Set(tos));
  }
  return g;
}

/** A NavGraph with no connections — findPath always returns null. */
const EMPTY_GRAPH: NavGraph = new Map();

/**
 * Spawn a player military unit at the given hex. The commanded tile defaults
 * to the spawn hex (mirrors what createCharacter does in production).
 */
function spawnPlayerUnit(
  world: ReturnType<typeof createWorld>,
  q: number,
  r: number,
  stanceMode: StanceMode = 'defensive',
  commandedQ = q,
  commandedR = r,
) {
  return world.spawn(
    HexPosition({ q, r, level: 0 }),
    FactionTrait({ faction: 'player' }),
    Unit({ unitType: 'Footman' }),
    Health({ current: 100, max: 100 }),
    Combatant({ attackDamage: 10, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
    EnemyTarget({ targetId: -1 }),
    PathQueue({ steps: [] }),
    Stance({ mode: stanceMode }),
    CommandedTile({ q: commandedQ, r: commandedR }),
  );
}

/** Spawn an enemy military unit at the given hex. */
function spawnEnemy(world: ReturnType<typeof createWorld>, q: number, r: number) {
  return world.spawn(
    HexPosition({ q, r, level: 0 }),
    FactionTrait({ faction: 'enemy' }),
    Unit({ unitType: 'Goblin' }),
    Health({ current: 80, max: 80 }),
    Combatant({ attackDamage: 8, attackRange: 1, attackCooldown: 1, attackTimer: 0 }),
    EnemyTarget({ targetId: -1 }),
    PathQueue({ steps: [] }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stanceBehaviorSystem (M_POLISH2.RTS.16)', () => {
  it('1. aggressive — acquires a distant enemy within the chase radius', () => {
    const world = createWorld();
    // Unit at 0,0 commanded at 0,0; enemy at 5,0 (well within AGGRESSIVE_CHASE_RADIUS=8).
    const unit = spawnPlayerUnit(world, 0, 0, 'aggressive', 0, 0);
    const enemy = spawnEnemy(world, 5, 0);

    // Both endpoints must exist in the graph for findPath to work.
    const graph = stubGraph({ '0,0': ['5,0'], '5,0': ['0,0'] });
    stanceBehaviorSystem(world, graph);

    const targetId = unit.get(EnemyTarget)?.targetId;
    expect(targetId).toBe(Number(enemy));
    // A path toward the enemy should be queued.
    const steps = unit.get(PathQueue)?.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);
  });

  it('2. aggressive — does NOT acquire an enemy beyond the chase radius from the commanded tile', () => {
    const world = createWorld();
    // Commanded tile at 0,0; enemy at 20,0 (exceeds AGGRESSIVE_CHASE_RADIUS=8).
    const unit = spawnPlayerUnit(world, 0, 0, 'aggressive', 0, 0);
    spawnEnemy(world, 20, 0);

    stanceBehaviorSystem(world, EMPTY_GRAPH);

    const targetId = unit.get(EnemyTarget)?.targetId;
    expect(targetId).toBe(-1);
  });

  it('3. defensive — engages an enemy within the defensive engage radius (4 hexes)', () => {
    const world = createWorld();
    // Unit + commanded tile at 0,0; enemy at 3,0 (within DEFENSIVE_ENGAGE_RADIUS=4).
    const unit = spawnPlayerUnit(world, 0, 0, 'defensive', 0, 0);
    const enemy = spawnEnemy(world, 3, 0);

    const graph = stubGraph({ '0,0': ['3,0'], '3,0': ['0,0'] });
    stanceBehaviorSystem(world, graph);

    expect(unit.get(EnemyTarget)?.targetId).toBe(Number(enemy));
  });

  it('4. defensive — queues a return-home path when no enemy is in range', () => {
    const world = createWorld();
    // Unit has moved away from its commanded tile; no nearby enemies.
    const unit = spawnPlayerUnit(world, 3, 0, 'defensive', 0, 0);
    // Enemy far outside defensive radius.
    spawnEnemy(world, 10, 0);

    // Provide a path from 3,0 back to 0,0 (both endpoints must exist in graph).
    const graph = stubGraph({ '3,0': ['0,0'], '0,0': ['3,0'] });
    stanceBehaviorSystem(world, graph);

    // No target acquired.
    expect(unit.get(EnemyTarget)?.targetId).toBe(-1);
    // But a return path was queued.
    const steps = unit.get(PathQueue)?.steps ?? [];
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toBe('0,0');
  });

  it('5. hold-position — acquires adjacent enemy but never queues a path', () => {
    const world = createWorld();
    const unit = spawnPlayerUnit(world, 0, 0, 'hold-position', 0, 0);
    // Enemy at distance 1 (adjacent, within attackRange=1).
    const enemy = spawnEnemy(world, 1, 0);
    // Also an enemy at distance 5 (should be ignored).
    spawnEnemy(world, 5, 0);

    stanceBehaviorSystem(world, EMPTY_GRAPH);

    expect(unit.get(EnemyTarget)?.targetId).toBe(Number(enemy));
    // PathQueue must remain empty — hold-position never moves.
    expect(unit.get(PathQueue)?.steps ?? []).toHaveLength(0);
  });

  it('6. stand-ground — acquires in-range enemy but does NOT queue a movement path', () => {
    const world = createWorld();
    // attackRange=1; enemy at distance 1 is in range.
    const unit = spawnPlayerUnit(world, 0, 0, 'stand-ground', 0, 0);
    const enemy = spawnEnemy(world, 1, 0);

    // A graph that could produce a path (stand-ground must NOT use it).
    const graph = stubGraph({ '0,0': ['1,0'], '1,0': [] });
    stanceBehaviorSystem(world, graph);

    // Target is acquired.
    expect(unit.get(EnemyTarget)?.targetId).toBe(Number(enemy));
    // PathQueue must remain empty — stand-ground does not move autonomously.
    expect(unit.get(PathQueue)?.steps ?? []).toHaveLength(0);
  });
});
