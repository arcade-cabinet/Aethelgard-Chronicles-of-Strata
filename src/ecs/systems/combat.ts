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
import { computeTerrainBonus } from '@/rules/terrain-bonus';
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
  /**
   * M_POLISH.3 — true when the attacker is a sword-wielder closing for
   * a melee strike (range ≤ 1, damageType 'normal', weapon 'sword').
   * Audio uses this to pick the bright sword-clash SFX over the
   * generic combat-hit. False for ranged + magic + siege + club.
   */
  isMeleeSword: boolean;
  /**
   * M_EXPANSION.AU.46 — true when the target's parryChance roll
   * succeeded and damage was set to 0. Audio fires the shield-deflect
   * cue; CombatText surfaces "Parried!" instead of a number.
   */
  parried: boolean;
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
  combatant: {
    attackTimer: number;
    attackCooldown: number;
    attackDamage: number;
    fatigue: number;
    fatigueDecayTimer: number;
  },
  target: { targetId: number },
  targetEntity: Entity,
  rng: Rng,
  delta: number,
  damageByTarget: Map<number, number>,
  events: DamageEvent[],
  damageType: DamageType,
  isMeleeSword: boolean,
  defenderParryChance: number,
  isRanged: boolean,
  rangedAccuracy: number,
  terrainMultiplier: number,
): number {
  combatant.attackTimer += delta;
  let fired = 0;
  // CodeRabbit-flagged: `while`, not `if`, so a long frame doesn't
  // silently drop attacks. Cap at 8 to prevent a runaway cycle on
  // pathological deltas.
  while (combatant.attackTimer >= combatant.attackCooldown && fired < 8) {
    combatant.attackTimer -= combatant.attackCooldown;
    // M_FUN.MAP.ELEV — fatigue multiplier on outgoing damage.
    // Range [0..1]; a unit just off a MOUNTAIN_PASS deals -50% dmg
    // until its fatigueDecayTimer recovers (path-follow integrates
    // fatigue accrual + decay; combat just consumes the field).
    // Reset the decay timer on every dealt attack so an actively-
    // fighting unit doesn't recover fatigue.
    combatant.fatigueDecayTimer = 0;
    const fatigueMul = Math.max(0, 1 - combatant.fatigue);
    const roll = rollDamage(combatant.attackDamage * fatigueMul, rng);
    // M_EXPANSION.AU.46 — parry roll happens BEFORE damage is applied
    // (so a parried hit deals 0 + plays shield-deflect instead of
    // sword-clash + a number). Only meaningful for melee hits — a
    // shield doesn't parry a fireball.
    const parried = defenderParryChance > 0 && isMeleeSword && rng() < defenderParryChance;
    // M_EXPANSION.T.135 — weather-driven ranged miss. Only fires
    // when the attacker is ranged + accuracy < 1; melee strikes
    // ignore the multiplier (rain doesn't make a sword swing miss).
    const missed = !parried && isRanged && rangedAccuracy < 1 && rng() > rangedAccuracy;
    // M_POLISH2.RTS.20 — terrain bonus is the LAST multiplier; high
    // ground amplifies all non-zero damage, low ground dampens it.
    // A parried/missed hit stays at 0 regardless of terrain.
    const baseDealt = parried || missed ? 0 : roll.damage;
    const dealt = baseDealt > 0 ? Math.round(baseDealt * terrainMultiplier) : 0;
    const id = target.targetId;
    damageByTarget.set(id, (damageByTarget.get(id) ?? 0) + dealt);
    events.push({
      target: targetEntity,
      damage: dealt,
      isCrit: !parried && !missed && roll.isCrit,
      damageType,
      isMeleeSword,
      parried,
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

/**
 * M_EXPANSION.T.135 — ranged-accuracy multiplier (weather-driven).
 * When < 1.0, each RANGED attack (attacker's meleeWeapon === 'none'
 * AND attackRange > 1) rolls against the multiplier; failed rolls
 * still consume the cooldown but deal 0 damage + emit a "miss"
 * event (damage 0). Melee attacks ignore the multiplier (they're
 * close-range physical; rain doesn't make a swing miss).
 */
export function combatSystem(
  world: World,
  rng: Rng,
  delta: number,
  rangedAccuracy = 1,
  /**
   * M_POLISH2.RTS.21 — choke-point defender multiplier. Caller passes
   * a function mapping (q, r) → multiplier (1.0 default, 0.9 when the
   * defender's tile qualifies as a choke). Optional — when omitted,
   * combat behaves as before (no choke math).
   */
  chokeMultiplier?: (q: number, r: number) => number,
): DamageEvent[] {
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
    const attackerProfile = attackerUnit ? unitProfileFor(attackerUnit) : null;
    const damageType: DamageType = attackerProfile?.damageType ?? 'normal';
    // M_POLISH.3 — sword melee detection: range gate (≤1) + weapon
    // class. A bow-Footman wouldn't trigger this (no such unit today,
    // but range≤1 keeps the contract honest for future ranged variants).
    const isMeleeSword = attackerProfile?.meleeWeapon === 'sword' && combatant.attackRange <= 1;
    // M_EXPANSION.AU.46 — defender's parry chance comes from THEIR
    // unit profile (Footman shields, BlackKnight half-shields).
    const targetUnit = targetEntity.get(Unit)?.unitType;
    const defenderParryChance = targetUnit ? unitProfileFor(targetUnit).parryChance : 0;
    // M_EXPANSION.T.135 — isRanged for the weather accuracy modifier.
    // attackerProfile.meleeWeapon === 'none' AND attackRange > 1 =
    // a true ranged attacker (Wizard, Trebuchet, future archers).
    // Watchtower buildings (no Unit trait) inherit isRanged via range.
    const isRanged =
      (attackerProfile?.meleeWeapon === 'none' || !attackerProfile) && combatant.attackRange > 1;
    // M_POLISH2.RTS.20 — terrain bonus from attacker's tile level vs
    // target's tile level. Pure function in src/rules/terrain-bonus.ts.
    // M_POLISH2.RTS.21 — choke-point defender bonus multiplies the
    // terrain bonus by the (optional) choke multiplier so a defender
    // on a choke tile takes 10% less even when attacker has high
    // ground (still nets ~1.125 net damage instead of 1.25).
    const choke = chokeMultiplier ? chokeMultiplier(targetHex.q, targetHex.r) : 1;
    const terrainMultiplier = computeTerrainBonus(hex.level, targetHex.level) * choke;
    const fired = resolveAttacks(
      combatant,
      target,
      targetEntity,
      rng,
      delta,
      damageByTarget,
      events,
      damageType,
      isMeleeSword,
      defenderParryChance,
      isRanged,
      rangedAccuracy,
      terrainMultiplier,
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
