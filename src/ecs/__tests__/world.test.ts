import { describe, expect, it } from 'vitest';
import { HexPosition, Transform } from '../components';
import { createEcsWorld } from '../world';

describe('ECS world', () => {
  it('creates a world and spawns an entity with components', () => {
    const world = createEcsWorld();
    const entity = world.spawn(HexPosition({ q: 1, r: 2, level: 3 }));
    expect(entity.has(HexPosition)).toBe(true);
    expect(entity.get(HexPosition)?.q).toBe(1);
  });

  it('updates a component value', () => {
    const world = createEcsWorld();
    const entity = world.spawn(Transform());
    entity.set(Transform, { x: 5, y: 0, z: 7, rotationY: 0 });
    expect(entity.get(Transform)?.x).toBe(5);
  });

  it('queries entities by component', () => {
    const world = createEcsWorld();
    world.spawn(HexPosition({ q: 0, r: 0, level: 1 }));
    world.spawn(HexPosition({ q: 1, r: 0, level: 1 }));
    world.spawn(Transform());
    expect(world.query(HexPosition).length).toBe(2);
  });
});
