import type { Entity, World } from 'koota';
import { hexDistance } from '@/core/hex';
import type { Rng } from '@/core/rng';
import { AnimationState, Combatant, EnemyTarget, Health, HexPosition } from '@/ecs/components';
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
 * range ticks its attack timer; when the cooldown elapses it rolls damage. To
 * keep multi-attacker damage correct, all damage rolls this tick are first
 * accumulated per target, then applied in one pass — otherwise two attackers
 * would both read the pre-tick Health and the later write would discard the
 * earlier hit. Returns the damage events so the render layer can spawn text.
 */
export function combatSystem(world: World, rng: Rng, delta: number): DamageEvent[] {
  const events: DamageEvent[] = [];
  // index entities by numeric id for target lookup
  const byId = new Map<number, Entity>();
  for (const e of world.query(Health)) byId.set(Number(e), e);

  // accumulate total damage per target id this tick
  const damageByTarget = new Map<number, number>();

  world.query(Combatant, EnemyTarget, HexPosition).updateEach(([combatant, target, hex], e) => {
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
    // Drain ALL elapsed cooldown windows this tick (`while`, not `if`) so a
    // long frame doesn't silently drop attacks — DPS stays frame-rate
    // independent. CodeRabbit-flagged: under stuttering the previous `if`
    // would mean a 0.3s frame on a 0.1s cooldown only fired one attack.
    let fired = 0;
    while (combatant.attackTimer >= combatant.attackCooldown && fired < 8) {
      combatant.attackTimer -= combatant.attackCooldown;
      const roll = rollDamage(combatant.attackDamage, rng);
      const id = target.targetId;
      damageByTarget.set(id, (damageByTarget.get(id) ?? 0) + roll.damage);
      events.push({ target: targetEntity, damage: roll.damage, isCrit: roll.isCrit });
      fired += 1;
    }
    if (fired > 0 && e.has(AnimationState)) {
      // M_COMBAT_POLISH.2 — flash the attacker into ATTACKING; animationSystem
      // will reset to IDLE/MOVING once the cooldown ends.
      e.set(AnimationState, { state: 'ATTACKING' });
    }
  });

  // apply accumulated damage once per target
  for (const [id, total] of damageByTarget) {
    const entity = byId.get(id);
    const health = entity?.get(Health);
    if (entity && health) {
      entity.set(Health, { ...health, current: Math.max(0, health.current - total) });
    }
  }
  return events;
}
