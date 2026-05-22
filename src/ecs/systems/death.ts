import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import { AnimationState, Health, Unit } from '@/ecs/components';

/** Seconds a corpse lingers (plays the death clip) before removal. */
const DEATH_DELAY: number = COMBAT.deathDelay;

/** Per-entity death timers — keyed by entity numeric id. */
const dyingTimers = new Map<number, number>();

/**
 * Reset the death-timer state. Called by `startGame` so a new session does not
 * inherit stale timers — entity ids are reused across worlds, and an orphan
 * timer would destroy a fresh entity early.
 */
export function clearDeathTimers(): void {
  dyingTimers.clear();
}

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
