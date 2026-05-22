import { describe, expect, it } from 'vitest';
import { AssignedJob, Building, Harvester } from '@/ecs/components';
import { buildSystem } from '@/ecs/systems/build';
import { createEcsWorld } from '@/ecs/world';

describe('build system', () => {
  it('advances Building.progress while a peon is BUILDING it', () => {
    const world = createEcsWorld();
    const site = world.spawn(Building({ buildingType: 'Farm', isComplete: false, progress: 0 }));
    const siteKey = '3,3';
    world.spawn(
      AssignedJob({ state: 'BUILDING', targetKey: siteKey }),
      Harvester({ harvestRate: 0.5, harvestTimer: 0 }),
    );
    // the site entity is keyed by siteKey via a parallel map passed to buildSystem
    buildSystem(world, new Map([[siteKey, site]]), 1);
    expect((site.get(Building)?.progress ?? 0)).toBeGreaterThan(0);
  });

  it('completes the building and frees the peon when progress reaches 1', () => {
    const world = createEcsWorld();
    const site = world.spawn(Building({ buildingType: 'Farm', isComplete: false, progress: 0.95 }));
    const siteKey = '3,3';
    const peon = world.spawn(
      AssignedJob({ state: 'BUILDING', targetKey: siteKey }),
      Harvester({ harvestRate: 1, harvestTimer: 0 }),
    );
    buildSystem(world, new Map([[siteKey, site]]), 1);
    expect(site.get(Building)?.isComplete).toBe(true);
    expect(peon.get(AssignedJob)?.state).toBe('IDLE');
  });
});
