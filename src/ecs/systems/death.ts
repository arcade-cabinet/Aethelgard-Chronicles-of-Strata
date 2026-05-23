import type { World } from 'koota';
import { COMBAT } from '@/config/combat';
import {
  AnimationState,
  DeathTimer,
  FactionTrait,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';

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
      const faction = entity.get(FactionTrait)?.faction;
      if (faction === 'enemy') enemyKills += 1;
      // M_EXPANSION.A.17 — drop a coffin visual at the death tile for
      // 3s after the unit removal. Enemy deaths only (player corpses
      // wouldn't be coffin-themed). DeathDropLayer (world component)
      // listens for this event and renders + ages the drops.
      if (faction === 'enemy' && typeof window !== 'undefined') {
        const hex = entity.get(HexPosition);
        if (hex) {
          window.dispatchEvent(
            new CustomEvent('aethelgard:enemy-death-drop', { detail: { q: hex.q, r: hex.r } }),
          );
        }
      }
      entity.destroy();
    } else {
      entity.set(DeathTimer, { elapsed });
    }
  }
  return enemyKills;
}
