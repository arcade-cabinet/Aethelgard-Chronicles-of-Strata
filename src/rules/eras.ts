/**
 * M_POLISH2.X4.27 + MODES.43 — era progression system.
 *
 * 4 eras for age-of-strata and any other mode that opts in:
 *   Stone   → 0 science, the starting era. Wood + stone economy only.
 *   Bronze  → 100 science. Unlocks Barracks tier 2 + faster harvest.
 *   Iron    → 250 science. Unlocks Watchtower + Wonder.
 *   Renaissance → 500 science. Unlocks the FINAL win path
 *                 (build a Wonder while in Renaissance = win).
 *
 * Era progression is per-faction — both player and enemy advance
 * independently. The thresholds are science totals; once spent on
 * the next-era unlock, science resets... actually no — science is
 * an accumulating pool; era flips when the pool CROSSES the
 * threshold. Simpler + reads naturally as "your civilization
 * advances when its accumulated knowledge crosses a milestone."
 *
 * This module is the rules table + the per-faction transition
 * helper. Game-state wires the per-tick check; HUD renders the
 * era badge + progress.
 */

export type Era = 'Stone' | 'Bronze' | 'Iron' | 'Renaissance';

export const ERAS: ReadonlyArray<Era> = ['Stone', 'Bronze', 'Iron', 'Renaissance'];

/** Science required to be IN this era (cumulative threshold). */
export const ERA_SCIENCE_THRESHOLD: Record<Era, number> = {
  Stone: 0,
  Bronze: 100,
  Iron: 250,
  Renaissance: 500,
};

/** Resolve the era for a given accumulated-science total. */
export function eraForScience(science: number): Era {
  if (science >= ERA_SCIENCE_THRESHOLD.Renaissance) return 'Renaissance';
  if (science >= ERA_SCIENCE_THRESHOLD.Iron) return 'Iron';
  if (science >= ERA_SCIENCE_THRESHOLD.Bronze) return 'Bronze';
  return 'Stone';
}

/** The next era after `current`, or null when already at the final era. */
export function nextEra(current: Era): Era | null {
  const idx = ERAS.indexOf(current);
  if (idx < 0 || idx >= ERAS.length - 1) return null;
  return ERAS[idx + 1] ?? null;
}

/** Science remaining to reach the next era, or 0 when at final. */
export function scienceToNextEra(science: number): number {
  const current = eraForScience(science);
  const next = nextEra(current);
  if (!next) return 0;
  return Math.max(0, ERA_SCIENCE_THRESHOLD[next] - science);
}

/**
 * HUD progress fraction (0..1) within the current era band.
 * At the start of Bronze (100 sci) the fraction is 0; at 250 sci
 * (about to hit Iron) it's 1.0.
 */
export function eraProgressFraction(science: number): number {
  const current = eraForScience(science);
  const next = nextEra(current);
  if (!next) return 1;
  const floor = ERA_SCIENCE_THRESHOLD[current];
  const ceiling = ERA_SCIENCE_THRESHOLD[next];
  const span = ceiling - floor;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (science - floor) / span));
}
