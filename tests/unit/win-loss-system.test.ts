import { describe, expect, it } from 'vitest';
import { Building, GoblinPortalTrait, Health } from '@/ecs/components';
import { evaluateWinLoss } from '@/ecs/systems/win-loss';
import { createEcsWorld } from '@/ecs/world';

describe('win/loss system', () => {
  it('returns "playing" while both the Portal and Town Hall live', () => {
    const world = createEcsWorld();
    world.spawn(
      GoblinPortalTrait({ spawnTimer: 0, spawnInterval: 45 }),
      Health({ current: 300, max: 300 }),
    );
    world.spawn(
      Building({ buildingType: 'TownHall', isComplete: true, progress: 1 }),
      Health({ current: 500, max: 500 }),
    );
    expect(evaluateWinLoss(world)).toBe('playing');
  });

  it('returns "win" when the Portal Health hits 0', () => {
    const world = createEcsWorld();
    world.spawn(
      GoblinPortalTrait({ spawnTimer: 0, spawnInterval: 45 }),
      Health({ current: 0, max: 300 }),
    );
    world.spawn(
      Building({ buildingType: 'TownHall', isComplete: true, progress: 1 }),
      Health({ current: 500, max: 500 }),
    );
    expect(evaluateWinLoss(world)).toBe('win');
  });

  it('returns "loss" when the Town Hall Health hits 0', () => {
    const world = createEcsWorld();
    world.spawn(
      GoblinPortalTrait({ spawnTimer: 0, spawnInterval: 45 }),
      Health({ current: 300, max: 300 }),
    );
    world.spawn(
      Building({ buildingType: 'TownHall', isComplete: true, progress: 1 }),
      Health({ current: 0, max: 500 }),
    );
    expect(evaluateWinLoss(world)).toBe('loss');
  });
});
