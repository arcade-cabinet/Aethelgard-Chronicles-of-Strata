/**
 * M_POLISH2.MODES.40 — frontier-raid pressure curve.
 *
 * In frontier-raid mode the enemy AI ramps its aggression up over
 * the course of the match. We don't track explicit "wave" entities
 * (the AI already produces military continuously via militaryWeight);
 * instead we surface the PRESSURE as a 0..1 curve the HUD can
 * display + the AI eval can multiply into its militaryWeight.
 *
 * Curve:
 *   t < 60s:        0    (calm — let the player get set up)
 *   60s..240s:      linear 0 → 1 ramp (60s = first 'wave', 240s = full intensity)
 *   t ≥ 240s:       1.0
 *
 * Pure function — same input always returns the same output.
 */
export const RAID_PRESSURE_START_S = 60;
export const RAID_PRESSURE_PEAK_S = 240;

export function raidPressureForElapsed(elapsedSeconds: number): number {
  if (elapsedSeconds < RAID_PRESSURE_START_S) return 0;
  if (elapsedSeconds >= RAID_PRESSURE_PEAK_S) return 1;
  return (elapsedSeconds - RAID_PRESSURE_START_S) / (RAID_PRESSURE_PEAK_S - RAID_PRESSURE_START_S);
}

/**
 * Label the current pressure for the HUD pill. 4 bands:
 *   0           → 'Calm' (greeny)
 *   0 < p ≤ 0.4 → 'Stirring' (gold)
 *   0.4 < p ≤ 0.75 → 'Raiding' (orange)
 *   p > 0.75    → 'Total War' (red)
 */
export function raidPressureLabel(p: number): {
  text: string;
  tone: 'calm' | 'stir' | 'raid' | 'war';
} {
  if (p <= 0) return { text: 'Calm', tone: 'calm' };
  if (p <= 0.4) return { text: 'Stirring', tone: 'stir' };
  if (p <= 0.75) return { text: 'Raiding', tone: 'raid' };
  return { text: 'Total War', tone: 'war' };
}
