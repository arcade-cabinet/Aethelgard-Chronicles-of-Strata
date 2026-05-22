import type { World } from 'koota';
import { AnimationState, Health, Unit } from '@/ecs/components';

/** Seconds a corpse lingers (plays the death clip) before removal. */
const DEATH_DELAY = 2;

/** Per-entity death timers — keyed by entity numeric id. */
const dyingTimers = new Map<number, number>();

/**
 * Handle unit death. A unit at 0 Health enters the DYING animation state; after
 * `DEATH_DELAY` seconds (the death clip length) it is removed from the world.
 */
export function deathSystem(world: World, delta: number): void {
  for (const entity of world.query(Unit, Health, AnimationState)) {
    const health = entity.get(Health);
    if (!health || health.current > 0) continue;
    const id = Number(entity);
    const anim = entity.get(AnimationState);
    if (anim && anim.state !== 'DYING') {
      entity.set(AnimationState, { state: 'DYING' });
    }
    const elapsed = (dyingTimers.get(id) ?? 0) + delta;
    if (elapsed >= DEATH_DELAY) {
      dyingTimers.delete(id);
      entity.destroy();
    } else {
      dyingTimers.set(id, elapsed);
    }
  }
}
