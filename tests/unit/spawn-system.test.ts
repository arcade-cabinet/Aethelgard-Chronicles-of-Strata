import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { FactionTrait, GoblinPortalTrait, HexPosition, Unit } from '@/ecs/components';
import { spawnSystem } from '@/ecs/systems/spawn';
import { createEcsWorld } from '@/ecs/world';

describe('spawn system', () => {
  it('spawns a goblin when the portal timer reaches the interval', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    // place the portal on a walkable tile with walkable neighbors
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      GoblinPortalTrait({ spawnTimer: 0, spawnInterval: 45 }),
    );
    const enemiesBefore = world
      .query(Unit, FactionTrait)
      .filter((e) => e.get(FactionTrait)?.faction === 'enemy').length;
    spawnSystem(world, board, 45); // one full interval
    const enemiesAfter = world
      .query(Unit, FactionTrait)
      .filter((e) => e.get(FactionTrait)?.faction === 'enemy').length;
    expect(enemiesAfter).toBe(enemiesBefore + 1);
  });

  it('does not spawn before the interval elapses', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      GoblinPortalTrait({ spawnTimer: 0, spawnInterval: 45 }),
    );
    spawnSystem(world, board, 10);
    expect(world.query(Unit).length).toBe(0);
  });
});
