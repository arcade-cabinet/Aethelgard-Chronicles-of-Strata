import { describe, expect, it } from 'vitest';
import { AnimationState, Movement } from '@/ecs/components';
import { animationSystem, clipForState } from '@/ecs/systems/animation';
import { createEcsWorld } from '@/ecs/world';

describe('animation system', () => {
  it('maps every state to its KayKit clip', () => {
    expect(clipForState('IDLE')).toBe('Idle_A');
    expect(clipForState('MOVING')).toBe('Walking_A');
    expect(clipForState('HARVESTING')).toBe('Interact');
    expect(clipForState('ATTACKING')).toBe('Throw');
    expect(clipForState('DYING')).toBe('Death_A');
    expect(clipForState('BUILDING')).toBe('Interact');
  });

  it('switches an idle unit to MOVING when it starts moving', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Movement({ speed: 2, isMoving: true }),
      AnimationState({ state: 'IDLE' }),
    );
    animationSystem(world);
    expect(e.get(AnimationState)?.state).toBe('MOVING');
  });

  it('returns a stopped unit to IDLE', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Movement({ speed: 2, isMoving: false }),
      AnimationState({ state: 'MOVING' }),
    );
    animationSystem(world);
    expect(e.get(AnimationState)?.state).toBe('IDLE');
  });

  it('does not override a non-movement state (HARVESTING) owned by another system', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Movement({ speed: 2, isMoving: false }),
      AnimationState({ state: 'HARVESTING' }),
    );
    animationSystem(world);
    expect(e.get(AnimationState)?.state).toBe('HARVESTING');
  });

  it('does not override ATTACKING or BUILDING states', () => {
    const world = createEcsWorld();
    const attacker = world.spawn(
      Movement({ speed: 2, isMoving: false }),
      AnimationState({ state: 'ATTACKING' }),
    );
    const builder = world.spawn(
      Movement({ speed: 2, isMoving: false }),
      AnimationState({ state: 'BUILDING' }),
    );
    animationSystem(world);
    expect(attacker.get(AnimationState)?.state).toBe('ATTACKING');
    expect(builder.get(AnimationState)?.state).toBe('BUILDING');
  });
});
