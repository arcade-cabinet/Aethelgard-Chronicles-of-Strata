import type { Faction, UnitType } from '@/ecs/components';
import type { Difficulty } from '@/game/difficulty';
import combatJson from './combat.json';

/** Base stats for one unit role. */
export interface UnitStat {
  /** Movement speed (tiles/sec). */
  speed: number;
  /** Which side the unit fights for. */
  faction: Faction;
  /** Max hit points — absent for non-combat roles (Peon). */
  hp?: number;
  /** Damage per attack — absent for non-combat roles. */
  attackDamage?: number;
  /** Attack reach in tiles — absent for non-combat roles. */
  attackRange?: number;
  /** Seconds between attacks — absent for non-combat roles. */
  attackCooldown?: number;
}

/**
 * Typed accessor for `combat.json` — unit stats, difficulty scaling, damage,
 * death, spawn, and AI tuning. The JSON is asserted to this shape exactly once,
 * here; consumers import the typed `COMBAT` object and the per-key types
 * (`UnitType`, `Difficulty`) give full checking with no per-site casts.
 */
export interface CombatConfig {
  /** Base stats per unit role. */
  unitStats: Record<UnitType, UnitStat>;
  /** HP/damage multiplier applied to enemy roles, per difficulty. */
  difficultyMultiplier: Record<Difficulty, number>;
  /** Damage-roll tuning. */
  damage: {
    /** Critical-hit probability per attack. */
    critChance: number;
    /** Maximum random damage bonus added to the base. */
    varianceMax: number;
  };
  /** Seconds a corpse lingers before the entity is removed. */
  deathDelay: number;
  /** Enemy-spawn tuning. */
  spawn: {
    /** Game-seconds after which the portal also spawns Orcs. */
    orcThreshold: number;
    /** Seconds between portal spawns, per difficulty. */
    spawnIntervalByDifficulty: Record<Difficulty, number>;
  };
  /** Enemy-AI tuning. */
  ai: {
    /** Search radius (tiles) within which an enemy picks a target. */
    aggroRadius: number;
  };
}

/** The validated combat tuning. Import this — never `combat.json` directly. */
export const COMBAT: CombatConfig = combatJson as CombatConfig;

// The accessors below are the single, documented place where the config's
// total-key Records are read. `noUncheckedIndexedAccess` widens every Record
// index to `T | undefined`; these keys (the three difficulties, the four unit
// roles) are guaranteed present in combat.json and covered by the config
// round-trip test, so one assertion here replaces a cast at every call site.

/** Portal spawn interval (seconds) for a difficulty. */
export function spawnIntervalFor(difficulty: Difficulty): number {
  return COMBAT.spawn.spawnIntervalByDifficulty[difficulty] as number;
}

/** Enemy HP/damage multiplier for a difficulty. */
export function difficultyMultiplierFor(difficulty: Difficulty): number {
  return COMBAT.difficultyMultiplier[difficulty] as number;
}

/** Base stats for a unit role. */
export function unitStatFor(role: UnitType): UnitStat {
  return COMBAT.unitStats[role] as UnitStat;
}
