import { z } from 'zod';
import type { Faction, UnitType } from '@/ecs/components';
import type { Difficulty } from '@/game/difficulty';
import combatJson from './combat.json';

/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `combat.json`. Replaces the bare `as CombatConfig` cast with a
 * runtime parse so JSON drift fails at module load.
 */

const FactionSchema = z.enum(['player', 'enemy']);
const DifficultySchema = z.enum(['easy', 'normal', 'hard']);

const UnitStatSchema = z.object({
  speed: z.number().positive(),
  faction: FactionSchema,
  hp: z.number().positive().optional(),
  attackDamage: z.number().nonnegative().optional(),
  attackRange: z.number().int().nonnegative().optional(),
  // Non-combat roles (Scout) carry attackCooldown=0 as a sentinel
  // for "doesn't attack". Allow 0 here; the combat tick already
  // skips entities with attackDamage=0.
  attackCooldown: z.number().nonnegative().optional(),
});

const CombatConfigSchema = z.object({
  unitStats: z.record(z.string(), UnitStatSchema),
  difficultyMultiplier: z.record(DifficultySchema, z.number().positive()),
  damage: z.object({
    critChance: z.number().min(0).max(1),
    varianceMax: z.number().nonnegative(),
  }),
  deathDelay: z.number().positive(),
  spawn: z.object({
    orcThreshold: z.number().nonnegative(),
    vampireThreshold: z.number().nonnegative(),
    witchThreshold: z.number().nonnegative(),
    blackKnightThreshold: z.number().nonnegative(),
    spawnIntervalByDifficulty: z.record(DifficultySchema, z.number().positive()),
  }),
  ai: z.object({
    aggroRadius: z.number().positive(),
    visionRadiusByDifficulty: z.record(DifficultySchema, z.number().positive()),
  }),
  encroachment: z.object({
    graceSecondsByDifficulty: z.record(DifficultySchema, z.number().nonnegative()),
  }),
});

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
    /** Game-seconds after which the portal also spawns Vampires. */
    vampireThreshold: number;
    /** Game-seconds after which the portal also spawns Witches. */
    witchThreshold: number;
    /** Game-seconds after which the portal also spawns Black Knights. */
    blackKnightThreshold: number;
    /** Seconds between portal spawns, per difficulty. */
    spawnIntervalByDifficulty: Record<Difficulty, number>;
  };
  /** Enemy-AI tuning. */
  ai: {
    /** Search radius (tiles) within which an enemy picks a target. */
    aggroRadius: number;
    /**
     * AI vision-cone radius per difficulty (M_AUDIT2.ARCH.8 — was a
     * hand-rolled const in game-state.ts). Easy = narrower cones; Hard
     * = wider — the AI never cheats, it just sees more / less.
     */
    visionRadiusByDifficulty: Record<Difficulty, number>;
  };
  /** Encroachment tuning (M_AUDIT2.ARCH.9 — was a const in encroachment.ts). */
  encroachment: {
    /** Seconds an enemy may stand on a defender's tile before flip. */
    graceSecondsByDifficulty: Record<Difficulty, number>;
  };
}

/** The validated combat tuning. Import this — never `combat.json` directly. */
const _validated = CombatConfigSchema.parse(combatJson);
export const COMBAT: CombatConfig = _validated as unknown as CombatConfig;

// The accessors below are the single, documented place where the config's
// total-key Records are read. `noUncheckedIndexedAccess` widens every Record
// index to `T | undefined`; these keys (the three difficulties, the seven unit
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

/** AI vision-cone radius for a difficulty (M_AUDIT2.ARCH.8). */
export function aiVisionRadiusFor(difficulty: Difficulty): number {
  return COMBAT.ai.visionRadiusByDifficulty[difficulty] as number;
}

/** Encroachment grace seconds for a difficulty (M_AUDIT2.ARCH.9). */
export function encroachmentGraceSecondsFor(difficulty: Difficulty): number {
  return COMBAT.encroachment.graceSecondsByDifficulty[difficulty] as number;
}
