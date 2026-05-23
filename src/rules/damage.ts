import type { DamageType } from '@/ecs/components';

/**
 * The DefensiveBehavior's armor side of the damage-type table (spec 102).
 * Maps each damage type to the field name on DefensiveBehavior that holds
 * the multiplier. Adding a new damage type = a new entry HERE + a new
 * field on DefensiveBehavior. No system-code branching.
 */
const ARMOR_FIELD: Record<
  DamageType,
  'armorVsNormal' | 'armorVsSiege' | 'armorVsMagic' | 'armorVsPierce'
> = {
  normal: 'armorVsNormal',
  siege: 'armorVsSiege',
  magic: 'armorVsMagic',
  pierce: 'armorVsPierce',
};

/**
 * Resolve the incoming-damage multiplier for `damageType` against a
 * Defender's armor record. Returns 1.0 (no resistance) when the defender
 * has no entry, so an Offender vs a non-Defender is unaffected.
 */
export function armorMultiplier(
  defender: {
    armorVsNormal?: number;
    armorVsSiege?: number;
    armorVsMagic?: number;
    armorVsPierce?: number;
  } | null,
  damageType: DamageType,
): number {
  if (!defender) return 1;
  const field = ARMOR_FIELD[damageType];
  const v = defender[field];
  return typeof v === 'number' ? v : 1;
}

/** Apply the table: final damage = base * armor multiplier. */
export function applyArmor(
  base: number,
  defender: {
    armorVsNormal?: number;
    armorVsSiege?: number;
    armorVsMagic?: number;
    armorVsPierce?: number;
  } | null,
  damageType: DamageType,
): number {
  return base * armorMultiplier(defender, damageType);
}
