import { describe, expect, it } from 'vitest';
import { axialToWorld } from '@/core/hex';
import { HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { createEcsWorld } from '@/ecs/world';

describe('path-follow system', () => {
  it('moves an entity toward the next path step', () => {
    const world = createEcsWorld();
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 100, isMoving: false }),
      PathQueue({ steps: ['1,0'] }),
    );
    pathFollowSystem(world, 1);
    const target = axialToWorld(1, 0);
    expect(entity.get(Transform)?.x).toBeCloseTo(target.x, 2);
    expect(entity.get(HexPosition)?.q).toBe(1);
  });

  it('pops a completed step from the path queue', () => {
    const world = createEcsWorld();
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 100, isMoving: false }),
      PathQueue({ steps: ['1,0', '2,0'] }),
    );
    pathFollowSystem(world, 1);
    expect(entity.get(PathQueue)?.steps).toEqual(['2,0']);
  });

  it('sets isMoving false when the path is empty', () => {
    const world = createEcsWorld();
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 2, isMoving: true }),
      PathQueue({ steps: [] }),
    );
    pathFollowSystem(world, 0.016);
    expect(entity.get(Movement)?.isMoving).toBe(false);
  });

  it('does not overshoot — partial progress on a small tick', () => {
    const world = createEcsWorld();
    const entity = world.spawn(
      HexPosition({ q: 0, r: 0, level: 2 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 0.1, isMoving: false }),
      PathQueue({ steps: ['1,0'] }),
    );
    pathFollowSystem(world, 0.016);
    const t = entity.get(Transform);
    expect(t?.x).toBeGreaterThan(0);
    expect(entity.get(HexPosition)?.q).toBe(0);
    expect(entity.get(PathQueue)?.steps).toEqual(['1,0']);
  });
});
