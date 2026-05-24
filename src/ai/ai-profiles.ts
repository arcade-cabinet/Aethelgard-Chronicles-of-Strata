/**
 * M_AI_AWARE.1 — per-mode AI cognition profile.
 *
 * The AI needs to read EVERY customization knob the player can pick
 * and adapt. This registry lives sibling to MODE_PRESETS in
 * src/rules/mode-presets.ts and parallels it 1:1 — one row per
 * GameMode. AiPlayer / AiDirector reads `aiProfileFor(game.mode)`
 * once per tick and uses the multipliers to weight Evaluators
 * (Build, Military, Train, Resign).
 *
 * Hierarchy:
 *   ARCHETYPE  = an Evaluator (BuildEvaluator, MilitaryEvaluator, …).
 *                The abstract scoring contract — input game state,
 *                output desirability 0..N.
 *   CONSUMER   = the Evaluator's per-mode tuning (this file).
 *                Each evaluator reads its slot from the active AI
 *                profile and multiplies the base desirability.
 *   SKIN       = per-faction brain bias from SKINS[faction].brain
 *                (already shipped — M_EXPANSION.S.53).
 *
 * The default profile is `border-clash` — balanced 1v1 weights.
 * Other modes derive by deviation: long-reign skips military
 * (bases are invulnerable, no kill-base win), coexistence skips
 * military entirely (no win at all), frontier-raid rushes hard, etc.
 */
import type { GameMode } from '@/game/game-state';

/**
 * Per-mode AI behavior weights. All multipliers default to 1.0;
 * deviations only fire on modes that need to feel distinct.
 */
export interface AiProfile {
  /**
   * Multiplier applied to BuildEvaluator desirability. >1.0 makes
   * the AI build more eagerly; 0 disables building entirely (e.g.
   * coexistence keeps the existing base, never adds structures).
   */
  buildWeight: number;
  /**
   * Multiplier applied to MilitaryEvaluator desirability. 0 disables
   * military training + attack moves entirely (coexistence). >1.0 =
   * rush; <1.0 = turtle.
   */
  militaryWeight: number;
  /**
   * Multiplier on the Wall / Watchtower / defensive structure slice
   * of BuildEvaluator. 0 = AI doesn't build walls (when bases are
   * invulnerable there's nothing to defend with them); 1.0 = default.
   */
  defensiveBuildWeight: number;
  /**
   * Turn-cap awareness multiplier. When game.turn.maxTurns is set
   * AND the remaining turns drop under `urgencyThreshold`, the AI
   * scales military by this factor to rush the final score. 1.0 = no
   * urgency rush; 2.0 = double military priority in endgame.
   */
  endgameUrgencyMultiplier: number;
  /** Turns-remaining threshold below which urgency kicks in. */
  urgencyThreshold: number;
}

const DEFAULT_PROFILE: AiProfile = {
  buildWeight: 1.0,
  militaryWeight: 1.0,
  defensiveBuildWeight: 1.0,
  endgameUrgencyMultiplier: 1.0,
  urgencyThreshold: 20,
};

/**
 * Per-mode AI profiles. The values are deltas from the default:
 *   border-clash:  baseline (the spec target).
 *   frontier-raid: small/fast/asymmetric — rush military, skip walls.
 *   long-reign:    bases invulnerable, attrition match — skip defensive
 *                  builds, normal military for attrition pressure.
 *   strata-wars:   continent + medium length — build heavy + tech.
 *   age-of-strata: 4X turn-based + 60-turn cap — turn-aware urgency
 *                  rush kicks in inside the last 20 turns.
 *   coexistence:   no-win sandbox — zero military, zero new builds.
 */
export const AI_PROFILES: Record<GameMode, AiProfile> = {
  'border-clash': { ...DEFAULT_PROFILE },
  'frontier-raid': {
    ...DEFAULT_PROFILE,
    buildWeight: 0.7,
    militaryWeight: 1.6,
    defensiveBuildWeight: 0.3,
  },
  'long-reign': {
    ...DEFAULT_PROFILE,
    defensiveBuildWeight: 0,
    militaryWeight: 1.1,
  },
  'strata-wars': {
    ...DEFAULT_PROFILE,
    buildWeight: 1.3,
    militaryWeight: 1.0,
  },
  'age-of-strata': {
    ...DEFAULT_PROFILE,
    buildWeight: 1.4,
    militaryWeight: 0.9,
    endgameUrgencyMultiplier: 2.0,
    urgencyThreshold: 20,
  },
  coexistence: {
    ...DEFAULT_PROFILE,
    buildWeight: 0,
    militaryWeight: 0,
    defensiveBuildWeight: 0,
  },
};

/** Lookup helper; defaults to border-clash. */
export function aiProfileFor(mode: GameMode | undefined): AiProfile {
  return AI_PROFILES[mode ?? 'border-clash'];
}

/**
 * Compute the urgency multiplier for the current tick. When the AI
 * is in a turn-capped mode and the remaining turns drop under the
 * profile's threshold, the multiplier kicks in. Returns 1.0 when
 * not applicable.
 */
export function endgameUrgencyFor(
  mode: GameMode | undefined,
  turnsElapsed: number | undefined,
  maxTurns: number | null | undefined,
): number {
  const profile = aiProfileFor(mode);
  if (maxTurns == null || turnsElapsed == null) return 1.0;
  const remaining = maxTurns - turnsElapsed;
  if (remaining > profile.urgencyThreshold) return 1.0;
  return profile.endgameUrgencyMultiplier;
}
