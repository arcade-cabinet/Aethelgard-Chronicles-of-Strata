import { describe, expect, it } from 'vitest';
import { parseHexKey, parseHexLevelKey } from '@/core/hex';

/**
 * CodeRabbit MED — parseHexKey/parseHexLevelKey NaN guard.
 *
 * `Number('abc')` is NaN, NOT undefined; the original `q ?? 0`
 * fallback only caught the empty-string-after-trailing-comma case.
 * Malformed inputs like 'foo,bar' previously NaN-poisoned the
 * caller's hex math; now they fall back to 0.
 */
describe('hex parse NaN guard (CodeRabbit MED)', () => {
  it('parseHexKey returns {0,0} for an empty string', () => {
    expect(parseHexKey('')).toEqual({ q: 0, r: 0 });
  });

  it('parseHexKey returns {0,0} for a non-numeric input', () => {
    expect(parseHexKey('foo,bar')).toEqual({ q: 0, r: 0 });
  });

  it('parseHexKey parses well-formed input', () => {
    expect(parseHexKey('3,-2')).toEqual({ q: 3, r: -2 });
  });

  it('parseHexLevelKey returns {0,0,0} for an empty string', () => {
    expect(parseHexLevelKey('')).toEqual({ q: 0, r: 0, level: 0 });
  });

  it('parseHexLevelKey returns {0,0,0} for non-numeric input', () => {
    expect(parseHexLevelKey('x,y,z')).toEqual({ q: 0, r: 0, level: 0 });
  });

  it('parseHexLevelKey returns 0 for any missing/NaN component', () => {
    expect(parseHexLevelKey('3,4,foo')).toEqual({ q: 3, r: 4, level: 0 });
  });
});
