import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { buildNavGraph } from '@/core/pathfinding';
import { AssignedJob, Carrier, HexPosition, PathQueue, ResourceTrait } from '@/ecs/components';
import { jobRoutingSystem } from '@/ecs/systems/job-routing';
import { createEcsWorld } from '@/ecs/world';

describe('job-routing system', () => {
  it('gives a SEEKING peon a path toward its resource target', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    // pick a walkable tile and a target two hops away (not adjacent)
    const start = [...graph.keys()][0] as string;
    const neighbor = [...(graph.get(start) ?? [])][0] as string;
    // take a neighbor of the neighbor that is not adjacent to start
    const twoHop =
      [...(graph.get(neighbor) ?? [])].find((k) => {
        const ns = graph.get(start);
        return k !== start && !ns?.has(k);
      }) ?? neighbor;
    const [sq, sr] = start.split(',').map(Number);
    const peon = world.spawn(
      HexPosition({ q: sq ?? 0, r: sr ?? 0, level: 2 }),
      AssignedJob({ state: 'SEEKING', targetKey: twoHop }),
      Carrier({ carryType: 'none', amount: 0 }),
      PathQueue({ steps: [] }),
    );
    jobRoutingSystem(world, board, graph, '0,0');
    expect(peon.get(PathQueue)?.steps.length ?? 0).toBeGreaterThan(0);
  });

  it('flips a SEEKING peon adjacent to its resource to HARVESTING', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    const peon = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      AssignedJob({ state: 'SEEKING', targetKey: '1,0' }),
      Carrier({ carryType: 'none', amount: 0 }),
      PathQueue({ steps: [] }),
    );
    jobRoutingSystem(world, board, graph, '0,0');
    expect(peon.get(AssignedJob)?.state).toBe('HARVESTING');
  });

  it('re-assigns an IDLE peon to the nearest live resource node', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    // place a live resource node on a walkable tile
    const tile = [...board.tiles.values()].find((t) => t.walkable);
    if (!tile) throw new Error('no walkable tile');
    world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      ResourceTrait({ resourceType: 'wood', amount: 100 }),
    );
    // an IDLE peon (its previous node depleted) somewhere on the board
    const peon = world.spawn(
      HexPosition({ q: tile.q, r: tile.r, level: tile.level }),
      AssignedJob({ state: 'IDLE', targetKey: '' }),
      Carrier({ carryType: 'none', amount: 0 }),
      PathQueue({ steps: [] }),
    );
    jobRoutingSystem(world, board, graph, '0,0');
    // the IDLE peon picked up the live node — the loop self-heals after depletion
    expect(peon.get(AssignedJob)?.state).toBe('SEEKING');
    expect(peon.get(AssignedJob)?.targetKey).toBe(`${tile.q},${tile.r}`);
  });

  it('leaves an IDLE peon idle when no live resource node exists', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    const peon = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      AssignedJob({ state: 'IDLE', targetKey: '' }),
      Carrier({ carryType: 'none', amount: 0 }),
      PathQueue({ steps: [] }),
    );
    jobRoutingSystem(world, board, graph, '0,0');
    expect(peon.get(AssignedJob)?.state).toBe('IDLE');
  });
});
