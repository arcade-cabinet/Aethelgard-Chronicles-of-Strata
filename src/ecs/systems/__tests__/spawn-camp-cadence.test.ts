/**
 * M_V11.CAMPS.MOB-SPAWN — spawn cadence + cap tests for the barbarian-
 * camp spawner path. Verifies:
 *   1. Capped spawner skips emit once liveMobs >= mobCap (timer still
 *      resets so it doesn't spin).
 *   2. Per-fire interval re-roll falls in the 90-180s band.
 *   3. Uncapped spawner (mobCap=0) keeps a constant cadence (legacy
 *      enemy base behavior).
 */
import { createWorld } from 'koota';
import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { EnemySpawner, FactionTrait, HexPosition } from '@/ecs/components';
import { spawnSystem } from '@/ecs/systems/lifecycle';

function findWalkable(board: ReturnType<typeof generateBoard>) {
  for (const t of board.tiles.values()) if (t.walkable) return t;
  throw new Error('no walkable tile');
}

function makeCamp(world: ReturnType<typeof createWorld>, q: number, r: number, level: number) {
  const e = world.spawn(EnemySpawner, FactionTrait, HexPosition);
  e.set(EnemySpawner, {
    spawnTimer: 0,
    spawnInterval: 90,
    spawnCount: 0,
    mobCap: 4,
    liveMobs: 0,
  });
  e.set(FactionTrait, { faction: 'barbarian-camp-1' as 'player' | 'enemy' });
  e.set(HexPosition, { q, r, level });
  return e;
}

describe('spawnSystem M_V11.CAMPS.MOB-SPAWN', () => {
  it('respects mobCap — stops spawning once liveMobs ≥ cap', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    const camp = makeCamp(world, t.q, t.r, t.level);
    // Deterministic seed-fed RNG (returns 0 every call → re-roll to
    // 90s exactly each fire).
    const rng = () => 0;
    // Tick 5 times at 95s each → would yield 5 mobs uncapped; cap=4
    // means we get at most 4 even after 5 cadence windows.
    for (let i = 0; i < 5; i++) {
      spawnSystem(world, board, 95, i * 95, 'normal', rng);
    }
    const spawner = camp.get(EnemySpawner);
    expect(spawner?.liveMobs).toBeLessThanOrEqual(4);
  });

  it('re-rolls interval into 90-180s band on capped spawners', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    const camp = makeCamp(world, t.q, t.r, t.level);
    // RNG returns 0.5 → 90 + floor(0.5 * 91) = 90 + 45 = 135s.
    const rng = () => 0.5;
    spawnSystem(world, board, 95, 0, 'normal', rng);
    const spawner = camp.get(EnemySpawner);
    expect(spawner?.spawnInterval).toBe(135);
    // Edge: rng=0 → 90, rng=0.999 → 180.
    const camp2 = makeCamp(world, t.q + 1, t.r, t.level);
    spawnSystem(world, board, 95, 0, 'normal', () => 0);
    expect(camp2.get(EnemySpawner)?.spawnInterval).toBe(90);
    const camp3 = makeCamp(world, t.q, t.r + 1, t.level);
    spawnSystem(world, board, 95, 0, 'normal', () => 0.999);
    const interval3 = camp3.get(EnemySpawner)?.spawnInterval ?? 0;
    expect(interval3).toBeGreaterThanOrEqual(90);
    expect(interval3).toBeLessThanOrEqual(180);
  });

  it('does NOT re-roll on uncapped (legacy) spawners', () => {
    const world = createWorld();
    const board = generateBoard('alpha-bravo-charlie', 8);
    const t = findWalkable(board);
    const e = world.spawn(EnemySpawner, FactionTrait, HexPosition);
    e.set(EnemySpawner, {
      spawnTimer: 0,
      spawnInterval: 45,
      spawnCount: 0,
      mobCap: 0,
      liveMobs: 0,
    });
    e.set(FactionTrait, { faction: 'enemy' });
    e.set(HexPosition, { q: t.q, r: t.r, level: t.level });
    spawnSystem(world, board, 50, 0, 'normal', () => 0.5);
    // spawnInterval stays at 45 — uncapped path skips the re-roll.
    expect(e.get(EnemySpawner)?.spawnInterval).toBe(45);
  });
});
