import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { EnemySpawner, FactionTrait, HexPosition, Unit } from '@/ecs/components';
import { pickEnemyRole, spawnSystem } from '@/ecs/systems/lifecycle';
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
      EnemySpawner({ spawnTimer: 0, spawnInterval: 45 }),
    );
    const enemiesBefore = world
      .query(Unit, FactionTrait)
      .filter((e) => e.get(FactionTrait)?.faction === 'enemy').length;
    spawnSystem(world, board, 45, 60); // one full interval; 60s — below Orc threshold
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
      EnemySpawner({ spawnTimer: 0, spawnInterval: 45 }),
    );
    spawnSystem(world, board, 10, 60);
    expect(world.query(Unit).length).toBe(0);
  });

  it('pickEnemyRole — Goblin only before 300s', () => {
    expect(pickEnemyRole(0, 0)).toBe('Goblin');
    expect(pickEnemyRole(5, 299)).toBe('Goblin');
  });

  it('pickEnemyRole — Vampire introduced at 300s', () => {
    // 3-cycle: 0,1→Goblin, 2→Vampire
    expect(pickEnemyRole(2, 300)).toBe('Vampire');
  });

  it('pickEnemyRole — Orc introduced at 600s', () => {
    // 4-cycle: 3→Orc
    expect(pickEnemyRole(3, 600)).toBe('Orc');
  });

  it('pickEnemyRole — Witch introduced at 900s', () => {
    // 5-cycle: 4→Witch
    expect(pickEnemyRole(4, 900)).toBe('Witch');
  });

  it('pickEnemyRole — BlackKnight introduced at 1200s', () => {
    // 6-cycle: 5→BlackKnight
    expect(pickEnemyRole(5, 1200)).toBe('BlackKnight');
  });

  it('pickEnemyRole — full roster cycles at 1200s', () => {
    // A full 6-cycle should contain each archetype exactly once per stint
    const roles = Array.from({ length: 6 }, (_, i) => pickEnemyRole(i, 1200));
    expect(roles).toContain('Goblin');
    expect(roles).toContain('Vampire');
    expect(roles).toContain('Orc');
    expect(roles).toContain('Witch');
    expect(roles).toContain('BlackKnight');
  });
});
