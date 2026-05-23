/**
 * HUD format helpers (M_AUDIT2.UX.10 + .11) — costLabel, formatInt,
 * formatTime regression coverage.
 */
import { describe, expect, it } from 'vitest';
import { costLabel, formatInt, formatTime } from '@/hud/format';

describe('costLabel', () => {
  it('omits zero/absent slots', () => {
    expect(costLabel({ wood: 60, stone: 0, gold: 0 })).toBe('60w');
  });
  it('joins multi-slot costs with a space', () => {
    expect(costLabel({ wood: 60, stone: 40, gold: 0 })).toBe('60w 40s');
  });
  it('handles science correctly', () => {
    expect(costLabel({ wood: 0, stone: 0, gold: 0, science: 100 })).toBe('100sci');
  });
  it('renders empty cost as "free"', () => {
    expect(costLabel({ wood: 0, stone: 0, gold: 0 })).toBe('free');
  });
});

describe('formatInt (M_AUDIT2.UX.10)', () => {
  it('inserts thousands separators in en-US', () => {
    expect(formatInt(1000)).toBe('1,000');
    expect(formatInt(12845)).toBe('12,845');
    expect(formatInt(1234567)).toBe('1,234,567');
  });
  it('handles small numbers without separators', () => {
    expect(formatInt(0)).toBe('0');
    expect(formatInt(42)).toBe('42');
    expect(formatInt(999)).toBe('999');
  });
  it('truncates fractional numbers', () => {
    expect(formatInt(1234.7)).toBe('1,234');
  });
  it('returns "0" for NaN/Infinity', () => {
    expect(formatInt(Number.NaN)).toBe('0');
    expect(formatInt(Number.POSITIVE_INFINITY)).toBe('0');
  });
});

describe('formatTime (M_AUDIT2.UX.11)', () => {
  it('formats under-1m as M:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(45)).toBe('0:45');
  });
  it('formats under-1h as M:SS', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(3599)).toBe('59:59');
  });
  it('switches to H:MM:SS past one hour', () => {
    expect(formatTime(3600)).toBe('1:00:00');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(7384)).toBe('2:03:04');
  });
  it('clamps NaN/negative to 0:00', () => {
    expect(formatTime(Number.NaN)).toBe('0:00');
    expect(formatTime(-5)).toBe('0:00');
  });
});
