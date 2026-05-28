import { describe, expect, it } from 'vitest';
import { FactionBase, Health } from '@/ecs/components';
import { evaluateWinLoss } from '@/ecs/systems/meta';
import { createEcsWorld } from '@/ecs/world';

describe('win/loss system', () => {
  it('returns "playing" while both faction bases live', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'enemy' }), Health({ current: 300, max: 300 }));
    world.spawn(FactionBase({ faction: 'player' }), Health({ current: 500, max: 500 }));
    expect(evaluateWinLoss(world)).toBe('playing');
  });

  it('returns "win" when the enemy base Health hits 0', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'enemy' }), Health({ current: 0, max: 300 }));
    world.spawn(FactionBase({ faction: 'player' }), Health({ current: 500, max: 500 }));
    expect(evaluateWinLoss(world)).toBe('win');
  });

  it('returns "loss" when the player home base Health hits 0', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'enemy' }), Health({ current: 300, max: 300 }));
    world.spawn(FactionBase({ faction: 'player' }), Health({ current: 0, max: 500 }));
    expect(evaluateWinLoss(world)).toBe('loss');
  });

  it('loss takes precedence when both bases fall on the same tick', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'enemy' }), Health({ current: 0, max: 300 }));
    world.spawn(FactionBase({ faction: 'player' }), Health({ current: 0, max: 500 }));
    expect(evaluateWinLoss(world)).toBe('loss');
  });
});
