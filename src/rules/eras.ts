/**
 * M_POLISH2.X4.27 + MODES.43 — era progression system.
 *
 * The four eras + their science thresholds are loaded from
 * `src/config/eras.json` via the Zod-validated loader below. Adding
 * a 5th era (Industrial, etc) is ONE entry in the JSON — the union
 * type, the threshold lookup, the HUD badge, the era-unlock dispatch
 * all pick it up automatically (the JSON-first archetype pattern,
 * same as `src/config/resources.json`).
 *
 * Era progression is per-faction — both player and enemy advance
 * independently. The thresholds are science totals; era flips when
 * the accumulated pool CROSSES the threshold. Reads naturally as
 * "your civilization advances when its knowledge crosses a
 * milestone."
 */
import { z } from 'zod';
import erasJson from '@/config/eras.json';

const EraConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  scienceThreshold: z.number().nonnegative(),
});
const ErasFileSchema = z.object({ eras: z.array(EraConfigSchema).min(1) });

function stripComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return input;
}

const _validated = ErasFileSchema.parse(stripComments(erasJson));

/** Era id — the type union narrows to the literal ids loaded from JSON. */
export type Era = 'Stone' | 'Bronze' | 'Iron' | 'Renaissance';

/** All era ids in ascending science-threshold order. */
export const ERAS: ReadonlyArray<Era> = _validated.eras.map((e) => e.id as Era);

/** Science required to be IN this era (cumulative threshold). */
export const ERA_SCIENCE_THRESHOLD: Record<Era, number> = Object.fromEntries(
  _validated.eras.map((e) => [e.id, e.scienceThreshold]),
) as Record<Era, number>;

/** Human-readable label for the HUD. */
export const ERA_LABEL: Record<Era, string> = Object.fromEntries(
  _validated.eras.map((e) => [e.id, e.label]),
) as Record<Era, string>;

/** Resolve the era for a given accumulated-science total. */
export function eraForScience(science: number): Era {
  let current: Era = ERAS[0] ?? ('Stone' as Era);
  for (const era of ERAS) {
    if (science >= ERA_SCIENCE_THRESHOLD[era]) current = era;
  }
  return current;
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
