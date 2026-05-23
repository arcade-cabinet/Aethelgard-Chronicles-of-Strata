import { describe, expect, it } from 'vitest';
import { HexPosition, Movement, PathQueue, Transform } from '@/ecs/components';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import { createEcsWorld } from '@/ecs/world';

describe('path follow system', () => {
  it('advances an entity toward its next step', () => {
    const world = createEcsWorld();
    // Place entity at origin, path to tile (1,0) which is at world x~1.73, z=0
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 5, isMoving: false }),
      PathQueue({ steps: ['1,0,0'] }),
    );
    pathFollowSystem(world, 0.1);
    const e = world.query(HexPosition)[0];
    const t = e?.get(Transform);
    // entity must have moved (x > 0 since tile (1,0) is at positive x)
    expect(t?.x ?? 0).toBeGreaterThan(0);
  });

  it('applies a speed multiplier to movement distance', () => {
    const world = createEcsWorld();
    world.spawn(
      HexPosition({ q: 0, r: 0, level: 0 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
      Movement({ speed: 5, isMoving: false }),
      PathQueue({ steps: ['1,0,0'] }),
    );
    pathFollowSystem(world, 0.1, 0.5);
    const e = world.query(HexPosition)[0];
    const t = e?.get(Transform);
    // with 0.5x multiplier the entity moves half as far: x should be between 0 and ~0.5*5*0.1=0.25
    expect(t?.x ?? 0).toBeGreaterThan(0);
    expect(t?.x ?? 0).toBeLessThan(0.26);
  });

  it('default speedMultiplier (1) gives same result as omitting it', () => {
    const world1 = createEcsWorld();
    const world2 = createEcsWorld();
    for (const w of [world1, world2]) {
      w.spawn(
        HexPosition({ q: 0, r: 0, level: 0 }),
        Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
        Movement({ speed: 5, isMoving: false }),
        PathQueue({ steps: ['1,0,0'] }),
      );
    }
    pathFollowSystem(world1, 0.1, 1);
    pathFollowSystem(world2, 0.1);
    const t1 = world1.query(Transform)[0]?.get(Transform);
    const t2 = world2.query(Transform)[0]?.get(Transform);
    expect(t1?.x).toBeCloseTo(t2?.x ?? 0, 10);
  });
});
