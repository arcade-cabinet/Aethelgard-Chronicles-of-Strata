import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import { AnimationState, DeathTimer, FactionTrait, Health, Unit } from '@/ecs/components';

/** Seconds a corpse lingers (plays the death clip) before removal. */
const DEATH_DELAY: number = COMBAT.deathDelay;

/**
 * Handle unit death. A unit at 0 Health enters the DYING animation state and
 * gains a `DeathTimer` component; after `DEATH_DELAY` seconds (the death clip
 * length) it is removed from the world. The timer is an ECS component, so a
 * mid-death unit survives a save/load round-trip.
 *
 * Returns the number of enemy-faction units removed this tick — the caller
 * credits kills from this rather than re-scanning the roster.
 */
export function deathSystem(world: World, delta: number): number {
  let enemyKills = 0;
  for (const entity of world.query(Unit, Health, AnimationState)) {
    const health = entity.get(Health);
    if (!health || health.current > 0) continue;

    const anim = entity.get(AnimationState);
    if (anim && anim.state !== 'DYING') {
      entity.set(AnimationState, { state: 'DYING' });
    }

    // accumulate the death countdown on the entity itself
    if (!entity.has(DeathTimer)) entity.add(DeathTimer);
    const timer = entity.get(DeathTimer);
    const elapsed = (timer?.elapsed ?? 0) + delta;
    if (elapsed >= DEATH_DELAY) {
      if (entity.get(FactionTrait)?.faction === 'enemy') enemyKills += 1;
      entity.destroy();
    } else {
      entity.set(DeathTimer, { elapsed });
    }
  }
  return enemyKills;
}
