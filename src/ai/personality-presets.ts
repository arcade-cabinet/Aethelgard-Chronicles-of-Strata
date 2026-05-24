/**
 * M_EXPANSION.S.67 — AI personality presets.
 *
 * Named bundles of (aggressiveness, economyFocus) that NewGameModal
 * or scenario configs can pick from. The bias values feed into
 * SKINS[faction].brain (M_EXPANSION.S.53) at session start; the
 * existing MilitaryEvaluator + BuildEvaluator paths multiply their
 * desirability by those biases.
 *
 * - aggressive : 1.4 / 0.85 (raids over economy)
 * - balanced   : 1.0 / 1.0 (default — what the necropolis enemy uses)
 * - defensive  : 0.85 / 1.2 (build first, attack only on threat)
 * - turtle     : 0.6 / 1.4 (max economy, minimum aggression)
 *
 * Picking a preset is data, not code: every preset is one row.
 */
export type AiPersonality = 'aggressive' | 'balanced' | 'defensive' | 'turtle';

export interface AiPersonalityPreset {
  aggressiveness: number;
  economyFocus: number;
}

export const AI_PERSONALITY_PRESETS: Record<AiPersonality, AiPersonalityPreset> = {
  aggressive: { aggressiveness: 1.4, economyFocus: 0.85 },
  balanced: { aggressiveness: 1.0, economyFocus: 1.0 },
  defensive: { aggressiveness: 0.85, economyFocus: 1.2 },
  turtle: { aggressiveness: 0.6, economyFocus: 1.4 },
};

export function personalityPresetFor(p: AiPersonality): AiPersonalityPreset {
  return AI_PERSONALITY_PRESETS[p];
}
