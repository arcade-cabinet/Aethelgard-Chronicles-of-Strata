import { describe, expect, it } from 'vitest';
import { AnimationState, Movement } from '@/ecs/components';
import { animationSystem, clipForState } from '@/ecs/systems/animation';
import { createEcsWorld } from '@/ecs/world';

describe('animation system', () => {
  it('maps each state to its KayKit clip', () => {
    expect(clipForState('IDLE')).toBe('Idle_A');
    expect(clipForState('MOVING')).toBe('Walking_A');
    expect(clipForState('DYING')).toBe('Death_A');
  });

  it('switches an idle unit to MOVING when it starts moving', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Movement({ speed: 2, isMoving: true }),
      AnimationState({ state: 'IDLE', clipName: 'Idle_A' }),
    );
    animationSystem(world);
    expect(e.get(AnimationState)?.state).toBe('MOVING');
    expect(e.get(AnimationState)?.clipName).toBe('Walking_A');
  });

  it('returns a stopped unit to IDLE', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Movement({ speed: 2, isMoving: false }),
      AnimationState({ state: 'MOVING', clipName: 'Walking_A' }),
    );
    animationSystem(world);
    expect(e.get(AnimationState)?.state).toBe('IDLE');
  });

  it('does not override a non-movement state (HARVESTING) owned by another system', () => {
    const world = createEcsWorld();
    const e = world.spawn(
      Movement({ speed: 2, isMoving: false }),
      AnimationState({ state: 'HARVESTING', clipName: 'Interact' }),
    );
    animationSystem(world);
    expect(e.get(AnimationState)?.state).toBe('HARVESTING');
  });
});
