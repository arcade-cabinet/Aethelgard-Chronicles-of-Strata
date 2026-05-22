import type { Rng } from '@/core/rng';
import combatConfigRaw from '@/config/combat.json';

/** Typed shape of the combat config JSON (damage sub-object). */
interface CombatConfig {
  unitStats: Record<string, unknown>;
  difficultyMultiplier: Record<string, number>;
  damage: { critChance: number; varianceMax: number };
  deathDelay: number;
  spawn: { orcThreshold: number; spawnIntervalByDifficulty: Record<string, number> };
  ai: { aggroRadius: number };
}
const combatConfig = combatConfigRaw as CombatConfig;

/** The result of one damage roll. */
export interface DamageRoll {
  /** Damage dealt (already crit-multiplied). */
  damage: number;
  /** Whether this roll was a critical hit. */
  isCrit: boolean;
}

/** Crit chance — 10% per the spec. */
const CRIT_CHANCE: number = combatConfig.damage.critChance;

/**
 * Roll attack damage. Base damage is `attackDamage + randomInt(0, varianceMax)`; a
 * `critChance` critical hit doubles it. `rng` is the event PRNG, so a seed
 * reproduces every fight exactly.
 */
export function rollDamage(attackDamage: number, rng: Rng): DamageRoll {
  const variance = Math.floor(rng() * (combatConfig.damage.varianceMax + 1)); // 0..varianceMax
  let damage = attackDamage + variance;
  const isCrit = rng() < CRIT_CHANCE;
  if (isCrit) damage *= 2;
  return { damage, isCrit };
}
