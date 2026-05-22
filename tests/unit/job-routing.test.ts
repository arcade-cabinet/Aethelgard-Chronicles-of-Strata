import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { buildNavGraph } from '@/core/pathfinding';
import {
  AssignedJob,
  Carrier,
  FactionTrait,
  HexPosition,
  PathQueue,
  ResourceTrait,
  Unit,
} from '@/ecs/components';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { createEcsWorld } from '@/ecs/world';
import { createZoneState } from '@/game/zone';

/** A baseline routing context for a board + world. */
function routingCtx(
  world: ReturnType<typeof createEcsWorld>,
  board: ReturnType<typeof generateBoard>,
) {
  return {
    world,
    board,
    graph: buildNavGraph(board),
    baseKeys: { player: '0,0', enemy: '99,99' },
    zones: { player: createZoneState(), enemy: createZoneState() },
  };
}

/** Spawn a player peon at (q,r) in a given job state. */
function peon(
  world: ReturnType<typeof createEcsWorld>,
  q: number,
  r: number,
  state: 'IDLE' | 'SEEKING' | 'HARVESTING' | 'CARRYING',
  targetKey = '',
) {
  return world.spawn(
    Unit({ unitType: 'Peon' }),
    FactionTrait({ faction: 'player' }),
    HexPosition({ q, r, level: 2 }),
    AssignedJob({ state, targetKey }),
    Carrier({ carryType: 'none', amount: 0 }),
    PathQueue({ steps: [] }),
  );
}

describe('job-routing system (M8.6c — autonomous peons)', () => {
  it('gives a SEEKING peon a path toward its resource target', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const ctx = routingCtx(world, board);
    const start = [...ctx.graph.keys()][0] as string;
    const neighbor = [...(ctx.graph.get(start) ?? [])][0] as string;
    const twoHop =
      [...(ctx.graph.get(neighbor) ?? [])].find((k) => {
        const ns = ctx.graph.get(start);
        return k !== start && !ns?.has(k);
      }) ?? neighbor;
    const [sq, sr] = start.split(',').map(Number);
    // a live resource at twoHop so the peon's seek target is real
    world.spawn(
      HexPosition({ q: Number(twoHop.split(',')[0]), r: Number(twoHop.split(',')[1]), level: 2 }),
      ResourceTrait({ resourceType: 'wood', amount: 100 }),
    );
    const p = peon(world, sq ?? 0, sr ?? 0, 'SEEKING', twoHop);
    jobRoutingSystem(ctx);
    expect(p.get(PathQueue)?.steps.length ?? 0).toBeGreaterThan(0);
  });

  it('flips a SEEKING peon adjacent to its resource to HARVESTING and claims the tile', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const ctx = routingCtx(world, board);
    // a resource at 1,0; peon at 0,0 is adjacent
    world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      ResourceTrait({ resourceType: 'wood', amount: 100 }),
    );
    const p = peon(world, 0, 0, 'SEEKING', '1,0');
    jobRoutingSystem(ctx);
    expect(p.get(AssignedJob)?.state).toBe('HARVESTING');
    // exploitation claims the tile for the peon's faction
    expect(ctx.zones.player.controlled.has('1,0')).toBe(true);
  });

  it('re-assigns an IDLE peon to the nearest live resource node', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const ctx = routingCtx(world, board);
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      ResourceTrait({ resourceType: 'wood', amount: 100 }),
    );
    const p = peon(world, tile.q, tile.r, 'IDLE');
    jobRoutingSystem(ctx);
    // an IDLE peon next to a resource immediately starts harvesting
    expect(['SEEKING', 'HARVESTING']).toContain(p.get(AssignedJob)?.state);
  });

  it('leaves an IDLE peon idle when no live resource node exists', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const ctx = routingCtx(world, board);
    const p = peon(world, 0, 0, 'IDLE');
    jobRoutingSystem(ctx);
    expect(p.get(AssignedJob)?.state).toBe('IDLE');
  });

  it('only routes the issuing faction — does not touch the other side', () => {
    const board = generateBoard('ancient-silver-forest');
    const world = createEcsWorld();
    const ctx = routingCtx(world, board);
    world.spawn(
      HexPosition({ q: 1, r: 0, level: 2 }),
      ResourceTrait({ resourceType: 'wood', amount: 100 }),
    );
    // a player peon at 0,0; an enemy peon at 0,0 — both adjacent to the resource
    peon(world, 0, 0, 'SEEKING', '1,0');
    const enemyPeon = world.spawn(
      Unit({ unitType: 'Peon' }),
      FactionTrait({ faction: 'enemy' }),
      HexPosition({ q: 0, r: 0, level: 2 }),
      AssignedJob({ state: 'SEEKING', targetKey: '1,0' }),
      Carrier({ carryType: 'none', amount: 0 }),
      PathQueue({ steps: [] }),
    );
    jobRoutingSystem(ctx);
    // both peons harvested — the system is faction-symmetric
    expect(enemyPeon.get(AssignedJob)?.state).toBe('HARVESTING');
    // each faction's zone separately claims the tile
    expect(ctx.zones.player.controlled.has('1,0')).toBe(true);
    expect(ctx.zones.enemy.controlled.has('1,0')).toBe(true);
  });
});
