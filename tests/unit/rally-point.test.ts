import { describe, expect, it } from 'vitest';
import { generateBoard } from '@/core/board';
import { buildNavGraph } from '@/core/pathfinding';
import { HexPosition, PathQueue } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { createCharacter } from '@/entities/character-factory';
import { applyRallyPoint, createRally, setRallyPoint } from '@/game/rally';

describe('rally points', () => {
  it('records the rally target tile', () => {
    const rally = createRally();
    setRallyPoint(rally, '5,0');
    expect(rally.targetKey).toBe('5,0');
  });

  it('paths a freshly trained footman to the rally point', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    // a footman on a walkable tile and a reachable rally tile
    const walk = [...graph.keys()];
    const fromKey = walk[0] as string;
    const toKey = walk[Math.min(4, walk.length - 1)] as string;
    const [fq, fr] = fromKey.split(',').map(Number);
    const footman = createCharacter({
      world,
      role: 'Footman',
      q: fq ?? 0,
      r: fr ?? 0,
      level: 2,
    });
    const rally = createRally();
    setRallyPoint(rally, toKey);
    applyRallyPoint(footman, board, graph, rally);
    expect((footman.get(PathQueue)?.steps.length ?? 0)).toBeGreaterThan(0);
  });

  it('does nothing when no rally point is set', () => {
    const board = generateBoard('ancient-silver-forest');
    const graph = buildNavGraph(board);
    const world = createEcsWorld();
    const footman = createCharacter({ world, role: 'Footman', q: 0, r: 0, level: 2 });
    const rally = createRally();
    applyRallyPoint(footman, board, graph, rally);
    expect(footman.get(PathQueue)?.steps).toEqual([]);
    void HexPosition;
  });
});
