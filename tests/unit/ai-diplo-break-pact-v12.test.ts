/**
 * M_V12.AI-DIPLO.BREAK-PACT — pin that:
 *   - personality.diploBias.break exists for every named personality,
 *   - the diploBias schema enforces the 0..2 range,
 *   - personality assignments match the PRD-v0.12 personality matrix
 *     (raider/hoarder/mad-king lean break; diplomat never breaks).
 */
import { describe, expect, it } from 'vitest';
import { personalityFor } from '@/config/ai-personalities';

describe('M_V12.AI-DIPLO — personality diploBias', () => {
  it('every named personality has a diploBias block', () => {
    for (const key of [
      'the-builder',
      'the-raider',
      'the-hoarder',
      'the-diplomat',
      'the-mad-king',
    ]) {
      const p = personalityFor(key);
      expect(p.diploBias, `${key} must declare diploBias`).toBeDefined();
    }
  });

  it('the-diplomat never breaks', () => {
    expect(personalityFor('the-diplomat').diploBias?.break).toBe(0);
  });

  it('the-mad-king always breaks (1.0)', () => {
    expect(personalityFor('the-mad-king').diploBias?.break).toBe(1);
  });

  it('the-raider has a high break bias (≥0.5 → eligible to break when ahead)', () => {
    expect(personalityFor('the-raider').diploBias?.break ?? 0).toBeGreaterThanOrEqual(0.5);
  });

  it('the-builder has a low break bias (<0.5 → ineligible)', () => {
    expect(personalityFor('the-builder').diploBias?.break ?? 0).toBeLessThan(0.5);
  });

  it('every named personality has propose/accept/tribute/break fields', () => {
    for (const key of [
      'the-builder',
      'the-raider',
      'the-hoarder',
      'the-diplomat',
      'the-mad-king',
    ]) {
      const b = personalityFor(key).diploBias;
      expect(b).toBeDefined();
      expect(typeof b?.propose).toBe('number');
      expect(typeof b?.accept).toBe('number');
      expect(typeof b?.tribute).toBe('number');
      expect(typeof b?.break).toBe('number');
      // CodeRabbit MINOR fix: pin the 0..2 schema contract.
      expect(b?.propose ?? -1).toBeGreaterThanOrEqual(0);
      expect(b?.propose ?? 99).toBeLessThanOrEqual(2);
      expect(b?.accept ?? -1).toBeGreaterThanOrEqual(0);
      expect(b?.accept ?? 99).toBeLessThanOrEqual(2);
      expect(b?.tribute ?? -1).toBeGreaterThanOrEqual(0);
      expect(b?.tribute ?? 99).toBeLessThanOrEqual(2);
      expect(b?.break ?? -1).toBeGreaterThanOrEqual(0);
      expect(b?.break ?? 99).toBeLessThanOrEqual(2);
    }
  });
});
