import { describe, expect, it } from 'vitest';
import {
  AssignedJob,
  Building,
  Carrier,
  Harvester,
  Health,
  ResourceTrait,
} from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';

describe('economy components', () => {
  it('ResourceTrait holds a type and amount', () => {
    const world = createEcsWorld();
    const node = world.spawn(ResourceTrait({ resourceType: 'wood', amount: 100 }));
    expect(node.get(ResourceTrait)?.resourceType).toBe('wood');
    expect(node.get(ResourceTrait)?.amount).toBe(100);
  });

  it('Carrier starts empty', () => {
    const world = createEcsWorld();
    const peon = world.spawn(Carrier());
    expect(peon.get(Carrier)?.amount).toBe(0);
    expect(peon.get(Carrier)?.carryType).toBe('none');
  });

  it('Building tracks construction progress', () => {
    const world = createEcsWorld();
    const b = world.spawn(Building({ buildingType: 'Farm', isComplete: false, progress: 0 }));
    expect(b.get(Building)?.isComplete).toBe(false);
  });

  it('AssignedJob defaults to an idle state', () => {
    const world = createEcsWorld();
    const peon = world.spawn(AssignedJob());
    expect(peon.get(AssignedJob)?.state).toBe('IDLE');
  });

  it('Harvester and Health carry their stats', () => {
    const world = createEcsWorld();
    const peon = world.spawn(Harvester({ harvestRate: 1, harvestTimer: 0 }), Health({ current: 50, max: 50 }));
    expect(peon.get(Harvester)?.harvestRate).toBe(1);
    expect(peon.get(Health)?.max).toBe(50);
  });
});
