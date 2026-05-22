import type { World } from 'koota';
import { type AnimState, AnimationState, Movement } from '@/ecs/components';

/** The KayKit clip name each animation state maps to. Source: 60-characters.md. */
const STATE_CLIP: Record<AnimState, string> = {
  IDLE: 'Idle_A',
  MOVING: 'Walking_A',
  HARVESTING: 'Interact',
  ATTACKING: 'Throw',
  DYING: 'Death_A',
  BUILDING: 'Interact',
};

/** The clip name for an animation state. */
export function clipForState(state: AnimState): string {
  return STATE_CLIP[state];
}

/**
 * Derive each unit's AnimationState from its movement. A unit that is moving
 * plays MOVING; otherwise it returns to IDLE — unless it is in a state the
 * movement system does not own (HARVESTING, ATTACKING, DYING, BUILDING), which
 * other systems set and this system leaves untouched.
 */
export function animationSystem(world: World): void {
  world.query(Movement, AnimationState).updateEach(([movement, anim]) => {
    // only the movement system owns the IDLE <-> MOVING transition
    if (anim.state !== 'IDLE' && anim.state !== 'MOVING') return;
    const next: AnimState = movement.isMoving ? 'MOVING' : 'IDLE';
    if (anim.state !== next) {
      anim.state = next;
      anim.clipName = clipForState(next);
    }
  });
}
