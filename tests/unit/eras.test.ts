import { describe, expect, it } from 'vitest';
import {
  ERA_SCIENCE_THRESHOLD,
  eraForScience,
  eraProgressFraction,
  nextEra,
  scienceToNextEra,
} from '@/rules/eras';

/**
 * M_POLISH2.MODES.43 + X4.27 — era progression contract.
 */
describe('M_POLISH2.MODES.43 — eras', () => {
  it('starting era is Stone', () => {
    expect(eraForScience(0)).toBe('Stone');
    expect(eraForScience(99)).toBe('Stone');
  });

  it('100 sci → Bronze', () => {
    expect(eraForScience(ERA_SCIENCE_THRESHOLD.Bronze)).toBe('Bronze');
    expect(eraForScience(150)).toBe('Bronze');
  });

  it('250 sci → Iron', () => {
    expect(eraForScience(ERA_SCIENCE_THRESHOLD.Iron)).toBe('Iron');
    expect(eraForScience(400)).toBe('Iron');
  });

  it('500 sci → Renaissance (final)', () => {
    expect(eraForScience(ERA_SCIENCE_THRESHOLD.Renaissance)).toBe('Renaissance');
    expect(eraForScience(9999)).toBe('Renaissance');
  });

  it('nextEra walks the chain', () => {
    expect(nextEra('Stone')).toBe('Bronze');
    expect(nextEra('Bronze')).toBe('Iron');
    expect(nextEra('Iron')).toBe('Renaissance');
    expect(nextEra('Renaissance')).toBeNull();
  });

  it('scienceToNextEra counts the gap', () => {
    expect(scienceToNextEra(0)).toBe(100);
    expect(scienceToNextEra(50)).toBe(50);
    expect(scienceToNextEra(100)).toBe(150);
    expect(scienceToNextEra(500)).toBe(0);
    expect(scienceToNextEra(9999)).toBe(0);
  });

  it('eraProgressFraction in [0, 1]', () => {
    expect(eraProgressFraction(0)).toBe(0);
    expect(eraProgressFraction(50)).toBe(0.5); // halfway through Stone (0..100)
    expect(eraProgressFraction(100)).toBe(0); // start of Bronze
    expect(eraProgressFraction(175)).toBe(0.5); // halfway through Bronze (100..250)
    expect(eraProgressFraction(500)).toBe(1); // Renaissance pinned at 1
    expect(eraProgressFraction(9999)).toBe(1);
  });
});
