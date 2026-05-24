import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { EnemySpawner, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { spawnSystem } from '@/ecs/systems/spawn';
import { createEcsWorld } from '@/ecs/world';

/** Count enemy units of a role. */
function countRole(world: ReturnType<typeof createEcsWorld>, role: string): number {
  return world.query(Unit).filter((e) => e.get(Unit)?.unitType === role).length;
}

describe('orc escalation', () => {
  it('spawns only Goblins before the escalation threshold', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      EnemySpawner({ spawnTimer: 0, spawnInterval: 45 }),
    );
    // gameElapsed = 60s — below the 600s Orc threshold
    spawnSystem(world, board, 45, 60);
    expect(countRole(world, 'Orc')).toBe(0);
    expect(countRole(world, 'Goblin')).toBeGreaterThan(0);
  });

  it('spawns Orcs once the game clock passes the threshold', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      EnemySpawner({ spawnTimer: 0, spawnInterval: 45 }),
    );
    // gameElapsed = 700s — past the 600s Orc threshold
    let orcs = 0;
    for (let i = 0; i < 10 && orcs === 0; i++) {
      spawnSystem(world, board, 45, 700);
      orcs = countRole(world, 'Orc');
    }
    expect(orcs).toBeGreaterThan(0);
    void FactionTrait;
  });
});
