import { describe, expect, it } from 'vitest';
import { Harvester } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { createEconomy } from '@/game/economy';
import { applyResearch, createResearch } from '@/game/research';

describe('research — Steel Plows', () => {
  it('multiplies every peon harvest rate by 1.5', () => {
    const world = createEcsWorld();
    const peon = world.spawn(Harvester({ harvestRate: 1, harvestTimer: 0 }));
    const research = createResearch();
    const eco = createEconomy();
    eco.gold = 200;
    eco.wood = 200;
    applyResearch(world, eco, research, 'steelPlows');
    expect(peon.get(Harvester)?.harvestRate).toBeCloseTo(1.5, 5);
  });
});
