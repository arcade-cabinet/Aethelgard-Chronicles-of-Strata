import { COMBAT } from '@/config/combat';
import type { Rng } from '@/core/rng';

/** The result of one damage roll. */
export interface DamageRoll {
  /** Damage dealt (already crit-multiplied). */
  damage: number;
  /** Whether this roll was a critical hit. */
  isCrit: boolean;
}

/**
 * Roll attack damage. Base damage is `attackDamage + randomInt(0, varianceMax)`;
 * a `critChance` critical hit doubles it. `rng` is the event PRNG, so a seed
 * reproduces every fight exactly.
 */
export function rollDamage(attackDamage: number, rng: Rng): DamageRoll {
  const variance = Math.floor(rng() * (COMBAT.damage.varianceMax + 1)); // 0..varianceMax
  let damage = attackDamage + variance;
  const isCrit = rng() < COMBAT.damage.critChance;
  if (isCrit) damage *= 2;
  return { damage, isCrit };
}
