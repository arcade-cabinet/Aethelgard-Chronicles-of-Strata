import type { Entity, World } from 'koota';
import { hexDistance } from '@/core/hex';
import type { Rng } from '@/core/rng';
import {
  AnimationState,
  Combatant,
  type DamageType,
  EnemyTarget,
  Health,
  HexPosition,
  Unit,
} from '@/ecs/components';
import { rollDamage } from '@/game/combat-math';
import { unitProfileFor } from '@/rules/unit-profiles';

/** A damage event produced by the combat system this tick (for FX/text). */
export interface DamageEvent {
  /** The entity that took damage. */
  target: Entity;
  /** Damage dealt. */
  damage: number;
  /** Whether it was a crit. */
  isCrit: boolean;
  /** M_EXPANSION.AU.45 — damageType of the attacker (drives per-type SFX). */
  damageType: DamageType;
}

/**
 * Advance every Combatant's attack. A combatant with a living EnemyTarget in
 * range ticks its attack timer; when the cooldown elapses it rolls damage. To
 * keep multi-attacker damage correct, all damage rolls this tick are first
 * accumulated per target, then applied in one pass — otherwise two attackers
 * would both read the pre-tick Health and the later write would discard the
 * earlier hit. Returns the damage events so the render layer can spawn text.
 */
/**
 * Resolve all attacks one attacker fires in the current tick at one
 * target. Drains every elapsed cooldown window (DPS stays frame-rate
 * independent under stuttering). Returns the count of attacks fired
 * so the caller can flip the attacker into ATTACKING state.
 *
 * M_MICRO.7.7 — extracted from combatSystem; the per-attacker loop is
 * the cognitively-dense block.
 */
function resolveAttacks(
  combatant: { attackTimer: number; attackCooldown: number; attackDamage: number },
  target: { targetId: number },
  targetEntity: Entity,
  rng: Rng,
  delta: number,
  damageByTarget: Map<number, number>,
  events: DamageEvent[],
  damageType: DamageType,
): number {
  combatant.attackTimer += delta;
  let fired = 0;
  // CodeRabbit-flagged: `while`, not `if`, so a long frame doesn't
  // silently drop attacks. Cap at 8 to prevent a runaway cycle on
  // pathological deltas.
  while (combatant.attackTimer >= combatant.attackCooldown && fired < 8) {
    combatant.attackTimer -= combatant.attackCooldown;
    const roll = rollDamage(combatant.attackDamage, rng);
    const id = target.targetId;
    damageByTarget.set(id, (damageByTarget.get(id) ?? 0) + roll.damage);
    events.push({
      target: targetEntity,
      damage: roll.damage,
      isCrit: roll.isCrit,
      damageType,
    });
    fired += 1;
  }
  return fired;
}

// M_AUDIT2.ARCH.55 — hoist per-tick allocations to module scope and
// .clear() each tick. byId + damageByTarget are rebuilt every tick
// from scratch (intentional, so dead targets don't stick); preserving
// the Map identity skips the allocation cost.
const REUSABLE_BY_ID: Map<number, Entity> = new Map();
const REUSABLE_DAMAGE: Map<number, number> = new Map();

export function combatSystem(world: World, rng: Rng, delta: number): DamageEvent[] {
  const events: DamageEvent[] = [];
  // Index entities by numeric id for target lookup. `Number(entity)` returns
  // the full packed (worldId, generation, entityId) value — two simultaneously
  // alive entities can't collide (different entityIds), AND across destroy/
  // respawn the generation bit changes so a recycled slot doesn't masquerade
  // as the old entity. The byId map is rebuilt each tick, so a dead target
  // simply fails the lookup.
  const byId = REUSABLE_BY_ID;
  byId.clear();
  for (const e of world.query(Health)) byId.set(Number(e), e);

  // accumulate total damage per target id this tick
  const damageByTarget = REUSABLE_DAMAGE;
  damageByTarget.clear();

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

    // M_EXPANSION.AU.45 — damageType comes from the attacker's unit
    // profile (Footman=normal, Trebuchet=siege, Wizard=magic).
    // Buildings (Watchtower) lack a Unit trait — default 'normal'.
    const attackerUnit = e.get(Unit)?.unitType;
    const damageType: DamageType = attackerUnit
      ? unitProfileFor(attackerUnit).damageType
      : 'normal';
    const fired = resolveAttacks(
      combatant,
      target,
      targetEntity,
      rng,
      delta,
      damageByTarget,
      events,
      damageType,
    );
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
