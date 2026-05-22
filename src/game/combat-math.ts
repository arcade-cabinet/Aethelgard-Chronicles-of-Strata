import type { Rng } from '@/core/rng';

/** The result of one damage roll. */
export interface DamageRoll {
  /** Damage dealt (already crit-multiplied). */
  damage: number;
  /** Whether this roll was a critical hit. */
  isCrit: boolean;
}

/** Crit chance — 10% per the spec. */
const CRIT_CHANCE = 0.1;

/**
 * Roll attack damage. Base damage is `attackDamage + randomInt(0, 3)`; a 10%
 * critical hit doubles it. `rng` is the event PRNG, so a seed reproduces every
 * fight exactly.
 */
export function rollDamage(attackDamage: number, rng: Rng): DamageRoll {
  const variance = Math.floor(rng() * 4); // 0..3
  let damage = attackDamage + variance;
  const isCrit = rng() < CRIT_CHANCE;
  if (isCrit) damage *= 2;
  return { damage, isCrit };
}
