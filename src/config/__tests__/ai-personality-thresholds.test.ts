/**
 * M_PIVOT.AI.JSON-PERSONALITIES — pin per-personality threshold flow.
 *
 * Acceptance: changing a personality's threshold value in JSON flows
 * through to the runtime evaluator. The pre-existing rageQuitThreshold
 * already had this property; this test asserts the new starvationThreshold
 * is read the same way.
 */
import { describe, expect, it } from 'vitest';
import { ALL_PERSONALITIES, DEFAULT_PERSONALITY, personalityFor } from '@/config/ai-personalities';

describe('M_PIVOT.AI.JSON-PERSONALITIES — per-personality thresholds', () => {
  it('every personality declares both rageQuitThreshold + starvationThreshold', () => {
    for (const key of ALL_PERSONALITIES) {
      const p = personalityFor(key);
      expect(p.rageQuitThreshold, `personality "${key}" missing rageQuitThreshold`).toBeDefined();
      expect(
        p.starvationThreshold,
        `personality "${key}" missing starvationThreshold`,
      ).toBeDefined();
      // Narrowed by the toBeDefined() asserts above; ?? 0 then > 0
      // avoids biome's noNonNullAssertion forbid.
      expect(p.rageQuitThreshold ?? 0).toBeGreaterThan(0);
      expect(p.starvationThreshold ?? 0).toBeGreaterThan(0);
    }
  });

  it('starvation tolerance varies meaningfully across personalities', () => {
    const hoarder = personalityFor('the-hoarder');
    const madKing = personalityFor('the-mad-king');
    // the-hoarder is patient; the-mad-king folds quickly. Diff must be
    // > 200s to count as a meaningful difference (otherwise the AI
    // tuner is wasting a knob).
    expect(hoarder.starvationThreshold!).toBeGreaterThan((madKing.starvationThreshold ?? 0) + 200);
  });

  it('the rage-quit + starvation tolerances correlate per personality temperament', () => {
    // The-builder is patient (high rageQuit + high starvation).
    // The-mad-king is impatient (low both).
    const builder = personalityFor('the-builder');
    const madKing = personalityFor('the-mad-king');
    expect(builder.rageQuitThreshold!).toBeGreaterThan(madKing.rageQuitThreshold!);
    expect(builder.starvationThreshold!).toBeGreaterThan(madKing.starvationThreshold!);
  });

  it('default personality is the-diplomat (balanced)', () => {
    expect(DEFAULT_PERSONALITY).toBe('the-diplomat');
    const diplomat = personalityFor(DEFAULT_PERSONALITY);
    expect(diplomat.rageQuitThreshold).toBe(180);
    expect(diplomat.starvationThreshold).toBe(300);
  });
});
