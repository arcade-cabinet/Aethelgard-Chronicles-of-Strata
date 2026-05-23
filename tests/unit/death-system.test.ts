import { describe, expect, it } from 'vitest';
import { AnimationState, Health, Unit } from '@/ecs/components';
import { deathSystem } from '@/ecs/systems/death';
import { createEcsWorld } from '@/ecs/world';

describe('death system', () => {
  it('sets a zero-health unit to the DYING animation state', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Unit({ unitType: 'Goblin' }),
      Health({ current: 0, max: 60 }),
      AnimationState({ state: 'IDLE' }),
    );
    deathSystem(world, 0.016);
    expect(e.get(AnimationState)?.state).toBe('DYING');
  });

  it('removes the entity after the death delay elapses', () => {
    const world = createEcsWorld();
    world.spawn(
      Unit({ unitType: 'Goblin' }),
      Health({ current: 0, max: 60 }),
      AnimationState({ state: 'IDLE' }),
    );
    // tick past the death delay (DEATH_DELAY seconds)
    for (let i = 0; i < 200; i++) deathSystem(world, 0.05);
    expect(world.query(Unit).length).toBe(0);
  });

  it('leaves living units alone', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Unit({ unitType: 'Footman' }),
      Health({ current: 100, max: 100 }),
      AnimationState({ state: 'IDLE' }),
    );
    deathSystem(world, 0.05);
    expect(e.get(AnimationState)?.state).toBe('IDLE');
    expect(world.query(Unit).length).toBe(1);
  });
});
