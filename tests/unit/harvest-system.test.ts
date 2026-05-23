import { describe, expect, it } from 'vitest';
import {
  AssignedJob,
  Carrier,
  Harvester,
  HexPosition,
  Movement,
  PathQueue,
  ResourceTrait,
} from '@/ecs/components';
import { harvestSystem } from '@/ecs/systems/harvest';
import { createEcsWorld } from '@/ecs/world';

/** Spawn a resource node entity at a tile and return its key. */
function spawnNode(world: ReturnType<typeof createEcsWorld>, q: number, r: number) {
  world.spawn(
    HexPosition({ q, r, level: 3 }),
    ResourceTrait({ resourceType: 'wood', amount: 100 }),
  );
  return `${q},${r}`;
}

describe('harvest system', () => {
  it('fills the Carrier when a peon in HARVESTING completes its timer', () => {
    const world = createEcsWorld();
    const nodeKey = spawnNode(world, 1, 0);
    const peon = world.spawn(
      HexPosition({ q: 0, r: 0, level: 3 }),
      AssignedJob({ state: 'HARVESTING', targetKey: nodeKey }),
      Harvester({ harvestRate: 100, harvestTimer: 0 }),
      Carrier({ carryType: 'none', amount: 0 }),
      Movement({ speed: 2, isMoving: false }),
      PathQueue({ steps: [] }),
    );
    // one big tick — harvestRate 100 completes a 1.0 cycle instantly
    harvestSystem(world, 1);
    expect(peon.get(Carrier)?.amount).toBeGreaterThan(0);
    expect(peon.get(Carrier)?.carryType).toBe('wood');
  });

  it('decrements the resource node amount on harvest', () => {
    const world = createEcsWorld();
    const nodeKey = spawnNode(world, 1, 0);
    const node = world.query(ResourceTrait)[0];
    const before = node?.get(ResourceTrait)?.amount ?? 0;
    const peon = world.spawn(
      HexPosition({ q: 0, r: 0, level: 3 }),
      AssignedJob({ state: 'HARVESTING', targetKey: nodeKey }),
      Harvester({ harvestRate: 100, harvestTimer: 0 }),
      Carrier({ carryType: 'none', amount: 0 }),
      Movement({ speed: 2, isMoving: false }),
      PathQueue({ steps: [] }),
    );
    void peon;
    harvestSystem(world, 1);
    expect(node?.get(ResourceTrait)?.amount).toBeLessThan(before);
  });

  it('transitions a full-Carrier peon to CARRYING', () => {
    const world = createEcsWorld();
    const nodeKey = spawnNode(world, 1, 0);
    const peon = world.spawn(
      HexPosition({ q: 0, r: 0, level: 3 }),
      AssignedJob({ state: 'HARVESTING', targetKey: nodeKey }),
      Harvester({ harvestRate: 100, harvestTimer: 0 }),
      Carrier({ carryType: 'none', amount: 0 }),
      Movement({ speed: 2, isMoving: false }),
      PathQueue({ steps: [] }),
    );
    harvestSystem(world, 1);
    expect(peon.get(AssignedJob)?.state).toBe('CARRYING');
  });
});
