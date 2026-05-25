import { z } from 'zod';
import personalitiesJson from './ai-personalities.json';

/**
 * M_FUN.AI.NAMED — typed accessor for `ai-personalities.json`.
 * Per PRD-v0.4 §7.6 — each opponent is a config row, not code.
 *
 * Adding a new opponent = one row here + (optionally) a portrait
 * asset. AiPlayer reads the weights map to multiply its goal
 * evaluator desirabilities.
 */

const WeightsSchema = z.object({
  build: z.number().positive(),
  military: z.number().positive(),
  defensive: z.number().min(0),
  patrol: z.number().positive(),
});
export type PersonalityWeights = z.infer<typeof WeightsSchema>;

const PersonalitySchema = z.object({
  displayName: z.string().min(1),
  description: z.string().min(1),
  weights: WeightsSchema,
  /** Documented exploitable flaw (player learns the matchup). */
  flaw: z.string().min(1),
  /**
   * M_FUN.REFACTOR.AI-SPLIT — per-personality rage-quit threshold (sim-seconds).
   * Once match-elapsed time exceeds this without spotting the enemy,
   * the MilitaryEvaluator desirability spikes to override Build forever.
   * Each personality has a different temperament:
   *   the-raider (120s) — quick to rage; the-hoarder (300s) — patient.
   * Defaults to 180 when absent.
   */
  rageQuitThreshold: z.number().positive().optional(),
  /**
   * M_PIVOT.AI.JSON-PERSONALITIES — per-personality starvation tolerance
   * (sim-seconds). When the AI's faction has 0 controlled tiles AND
   * sub-10 wood/stone/gold for this many continuous seconds, ResignEvaluator
   * fires (long-reign mode only). Defaults to 300 when absent. Each
   * personality has a different give-up cadence — the-hoarder (480s)
   * survives long droughts; the-mad-king (180s) folds quickly.
   */
  starvationThreshold: z.number().positive().optional(),
});
export type Personality = z.infer<typeof PersonalitySchema>;

const FileSchema = z.object({
  personalities: z.record(z.string(), PersonalitySchema),
  default: z.string().min(1),
});

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

const validated = FileSchema.parse(stripComments(personalitiesJson));

if (!(validated.default in validated.personalities)) {
  throw new Error(`ai-personalities.json: default '${validated.default}' is not a personality key`);
}

/** All personality keys, in registration order. */
export const ALL_PERSONALITIES: ReadonlyArray<string> = Object.keys(validated.personalities);

/** Resolve a personality by key, or the default. */
export function personalityFor(key: string | undefined): Personality {
  const p = (key && validated.personalities[key]) || validated.personalities[validated.default];
  if (!p) throw new Error('ai-personalities.json: no personalities and no valid default');
  return p;
}

/** Default personality key. */
export const DEFAULT_PERSONALITY: string = validated.default;
