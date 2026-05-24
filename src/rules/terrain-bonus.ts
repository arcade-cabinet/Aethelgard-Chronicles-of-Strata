/**
 * M_POLISH2.RTS.20 — terrain combat bonuses.
 *
 * Two stackable multipliers applied at combat resolution time:
 *
 *   - HIGH-GROUND: attacker's tile level > target's tile level →
 *     damage × HIGH_GROUND_MULTIPLIER (default 1.25). Encourages
 *     the player to push hilltops and ridges, gives terrain
 *     authorship a real gameplay reward.
 *
 *   - LOW-GROUND: attacker's tile level < target's tile level →
 *     damage × LOW_GROUND_MULTIPLIER (default 0.85). Symmetric
 *     penalty — fighting up the hill is harder. Default penalty
 *     is lighter than the bonus (1.25 / 0.85 ≈ 1.47× swing in
 *     the high-ground attacker's favor) so the system FAVOURS
 *     terrain offense.
 *
 *   - SAME LEVEL: 1.0 (no modifier).
 *
 * Pure function; combat.ts threads the attacker + defender HexPosition
 * levels into computeTerrainBonus and multiplies the roll.
 */
export const HIGH_GROUND_MULTIPLIER = 1.25;
export const LOW_GROUND_MULTIPLIER = 0.85;

/** Compute the multiplier for an attack from `attackerLevel` against `targetLevel`. */
export function computeTerrainBonus(attackerLevel: number, targetLevel: number): number {
  if (attackerLevel > targetLevel) return HIGH_GROUND_MULTIPLIER;
  if (attackerLevel < targetLevel) return LOW_GROUND_MULTIPLIER;
  return 1;
}

/**
 * Classify the bonus for HUD surfacing. The SelectionPanel pill reads
 * this label (e.g. "↑ High Ground +25%") when the selected unit's
 * current attack would benefit/suffer from the bonus.
 */
export function terrainBonusLabel(multiplier: number): string | null {
  if (multiplier > 1) return `↑ High Ground +${Math.round((multiplier - 1) * 100)}%`;
  if (multiplier < 1) return `↓ Low Ground ${Math.round((multiplier - 1) * 100)}%`;
  return null;
}
