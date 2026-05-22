import type { Entity, World } from 'koota';
import { hexDistance } from '@/core/hex';
import type { Rng } from '@/core/rng';
import { Combatant, EnemyTarget, Health, HexPosition } from '@/ecs/components';
import { rollDamage } from '@/game/combat-math';

/** A damage event produced by the combat system this tick (for FX/text). */
export interface DamageEvent {
  /** The entity that took damage. */
  target: Entity;
  /** Damage dealt. */
  damage: number;
  /** Whether it was a crit. */
  isCrit: boolean;
}

/**
 * Advance every Combatant's attack. A combatant with a living EnemyTarget in
 * range ticks its attack timer; when the cooldown elapses it rolls damage,
 * applies it to the target's Health, and resets. Returns the damage events
 * this tick so the render layer can spawn floating combat text.
 */
export function combatSystem(world: World, rng: Rng, delta: number): DamageEvent[] {
  const events: DamageEvent[] = [];
  // index entities by numeric id for target lookup
  const byId = new Map<number, Entity>();
  for (const e of world.query(Health)) byId.set(Number(e), e);

  world.query(Combatant, EnemyTarget, HexPosition).updateEach(([combatant, target, hex], self) => {
    const targetEntity = byId.get(target.targetId);
    const targetHealth = targetEntity?.get(Health);
    if (!targetEntity || !targetHealth || targetHealth.current <= 0) {
      target.targetId = -1;
      return;
    }
    const targetHex = targetEntity.get(HexPosition);
    if (!targetHex) {
      target.targetId = -1;
      return;
    }
    const dist = hexDistance(hex.q, hex.r, targetHex.q, targetHex.r);
    if (dist > combatant.attackRange) return; // AI moves it into range

    combatant.attackTimer += delta;
    if (combatant.attackTimer >= combatant.attackCooldown) {
      combatant.attackTimer = 0;
      const roll = rollDamage(combatant.attackDamage, rng);
      targetEntity.set(Health, {
        ...targetHealth,
        current: Math.max(0, targetHealth.current - roll.damage),
      });
      events.push({ target: targetEntity, damage: roll.damage, isCrit: roll.isCrit });
    }
    void self;
  });
  return events;
}
