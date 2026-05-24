/**
 * M_EXPANSION.T.134 — AI personality preset arbitration test.
 *
 * Pin the (aggressiveness, economyFocus) bias values for each
 * named preset so a future contributor can't silently re-tune them
 * (the values are gameplay-balance load-bearing — bumping
 * 'aggressive' to 2.0 turns the AI into a one-build-one-attack
 * spammer that ignores its economy).
 */
import { describe, expect, it } from 'vitest';
import {
  AI_PERSONALITY_PRESETS,
  type AiPersonality,
  personalityPresetFor,
} from '@/ai/personality-presets';

describe('AI personality presets (M_EXPANSION.T.134)', () => {
  const expected: Record<AiPersonality, { aggressiveness: number; economyFocus: number }> = {
    aggressive: { aggressiveness: 1.4, economyFocus: 0.85 },
    balanced: { aggressiveness: 1.0, economyFocus: 1.0 },
    defensive: { aggressiveness: 0.85, economyFocus: 1.2 },
    turtle: { aggressiveness: 0.6, economyFocus: 1.4 },
  };

  for (const [name, want] of Object.entries(expected)) {
    it(`'${name}' bias matches the spec'd values`, () => {
      const got = personalityPresetFor(name as AiPersonality);
      expect(got).toEqual(want);
      expect(AI_PERSONALITY_PRESETS[name as AiPersonality]).toEqual(want);
    });
  }

  it('aggressive bias > balanced > defensive > turtle on aggressiveness', () => {
    const order = (['aggressive', 'balanced', 'defensive', 'turtle'] as AiPersonality[]).map(
      (n) => personalityPresetFor(n).aggressiveness,
    );
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i]).toBeGreaterThan(order[i + 1] as number);
    }
  });

  it('turtle has the highest economyFocus + aggressive has the lowest', () => {
    expect(personalityPresetFor('turtle').economyFocus).toBeGreaterThan(
      personalityPresetFor('aggressive').economyFocus,
    );
  });
});
