import { describe, expect, it } from 'vitest';
import { AI_PROFILES, aiProfileFor, endgameUrgencyFor } from '@/ai/ai-profiles';

/**
 * M_AI_AWARE.1 — pin the per-mode AI profile values so a future
 * accidental edit re-tunes the AI without intent. Each row carries
 * gameplay-defining multipliers (coexistence MUST have buildWeight
 * AND militaryWeight at 0 or the AI defies the no-win contract;
 * frontier-raid MUST stay above 1.5 militaryWeight or it stops
 * being a rush mode). Tests are deliberately fragile so a tuning
 * change forces a docstring update too.
 */
describe('M_AI_AWARE.1 — AI mode profiles', () => {
  it('coexistence has zero build + zero military (no-win sandbox)', () => {
    const p = AI_PROFILES.coexistence;
    expect(p.buildWeight).toBe(0);
    expect(p.militaryWeight).toBe(0);
    expect(p.defensiveBuildWeight).toBe(0);
  });

  it('long-reign has zero defensive build weight (invulnerable bases)', () => {
    const p = AI_PROFILES['long-reign'];
    expect(p.defensiveBuildWeight).toBe(0);
    expect(p.militaryWeight).toBeGreaterThan(1.0);
  });

  it('frontier-raid is a rush mode (high military, low defense)', () => {
    const p = AI_PROFILES['frontier-raid'];
    expect(p.militaryWeight).toBeGreaterThan(1.5);
    expect(p.defensiveBuildWeight).toBeLessThan(0.5);
  });

  it('strata-wars is build-heavy (high build, normal military)', () => {
    const p = AI_PROFILES['strata-wars'];
    expect(p.buildWeight).toBeGreaterThan(1.2);
  });

  it('age-of-strata triggers urgency in the last 20 turns', () => {
    // turn 30 of 60 → 30 turns remaining → no urgency
    expect(endgameUrgencyFor('age-of-strata', 30, 60)).toBe(1.0);
    // turn 40 of 60 → 20 turns remaining → AT threshold, urgency
    expect(endgameUrgencyFor('age-of-strata', 40, 60)).toBe(2.0);
    // turn 50 of 60 → 10 turns remaining → urgency
    expect(endgameUrgencyFor('age-of-strata', 50, 60)).toBe(2.0);
  });

  it('uncapped modes never trigger urgency (null maxTurns)', () => {
    expect(endgameUrgencyFor('age-of-strata', 100, null)).toBe(1.0);
    expect(endgameUrgencyFor('border-clash', undefined, undefined)).toBe(1.0);
  });

  it('aiProfileFor defaults to border-clash on unknown mode', () => {
    // Force a deliberately invalid GameMode and verify fallback
    expect(aiProfileFor(undefined)).toEqual(AI_PROFILES['border-clash']);
  });
});
