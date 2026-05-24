import { describe, expect, it } from 'vitest';
import {
  RAID_PRESSURE_PEAK_S,
  RAID_PRESSURE_START_S,
  raidPressureForElapsed,
  raidPressureLabel,
} from '@/rules/raid-pressure';

/**
 * M_POLISH2.MODES.40 — raid pressure curve. Pure-function contract.
 */
describe('M_POLISH2.MODES.40 — raid pressure', () => {
  it('before RAID_PRESSURE_START_S returns 0', () => {
    expect(raidPressureForElapsed(0)).toBe(0);
    expect(raidPressureForElapsed(30)).toBe(0);
    expect(raidPressureForElapsed(RAID_PRESSURE_START_S - 0.01)).toBe(0);
  });

  it('at RAID_PRESSURE_START_S returns 0 (boundary inclusive on the OFF side)', () => {
    // At exactly start, the linear ramp is at its zero — first
    // wave starts AT that second.
    expect(raidPressureForElapsed(RAID_PRESSURE_START_S)).toBe(0);
  });

  it('at peak returns 1', () => {
    expect(raidPressureForElapsed(RAID_PRESSURE_PEAK_S)).toBe(1);
    expect(raidPressureForElapsed(RAID_PRESSURE_PEAK_S + 100)).toBe(1);
  });

  it('linear ramp at midpoint returns ~0.5', () => {
    const mid = (RAID_PRESSURE_START_S + RAID_PRESSURE_PEAK_S) / 2;
    expect(raidPressureForElapsed(mid)).toBeCloseTo(0.5, 5);
  });

  it('labels by 4 bands', () => {
    expect(raidPressureLabel(0).tone).toBe('calm');
    expect(raidPressureLabel(0.2).tone).toBe('stir');
    expect(raidPressureLabel(0.6).tone).toBe('raid');
    expect(raidPressureLabel(0.9).tone).toBe('war');
  });
});
