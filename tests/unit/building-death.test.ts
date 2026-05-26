import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { Building, FactionBase, FactionTrait, Health, HexPosition } from '@/ecs/components';
import { buildingDeathSystem } from '@/ecs/systems/building-death';
import { createEcsWorld } from '@/ecs/world';

describe('buildingDeathSystem (M_GAMEPLAY.6)', () => {
  it('removes a 0-HP non-base building, restores tile walkability + rebuilds nav graph', () => {
    const board = generateBoard('building-death-test');
    const world = createEcsWorld();
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const key = `${tile.q},${tile.r}`;
    // place a Building entity at the tile + mark tile unwalkable
    tile.walkable = false;
    const sites = new Map();
    const ent = world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      Health({ current: 0, max: 100 }),
      FactionTrait({ faction: 'player' }),
    );
    sites.set(key, ent);
    const graph = buildingDeathSystem(world, sites, board);
    expect(graph).not.toBeNull();
    expect(sites.has(key)).toBe(false);
    expect(tile.walkable).toBe(true);
  });

  it('leaves FactionBase entities alone — that is the win/loss anchor', () => {
    const board = generateBoard('faction-base-test');
    const world = createEcsWorld();
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    const sites = new Map();
    const baseEnt = world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      Building({ buildingType: 'Palace', isComplete: true, progress: 1 }),
      Health({ current: 0, max: 500 }),
      FactionTrait({ faction: 'player' }),
      FactionBase({ faction: 'player' }),
    );
    const graph = buildingDeathSystem(world, sites, board);
    expect(graph).toBeNull();
    // base entity NOT destroyed — still queryable
    expect(baseEnt.get(Building)?.buildingType).toBe('Palace');
  });

  it('returns null on a no-op tick (no 0-HP buildings)', () => {
    const board = generateBoard('noop-test');
    const world = createEcsWorld();
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      Health({ current: 100, max: 100 }),
      FactionTrait({ faction: 'player' }),
    );
    const graph = buildingDeathSystem(world, new Map(), board);
    expect(graph).toBeNull();
  });
});
