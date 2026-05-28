/**
 * Rally state regression coverage (M_AUDIT2.ARCH.47).
 *
 * Pins the small state shape — rally.targetKey starts empty,
 * setRallyPoint assigns, and writes are stable.
 */
import { describe, expect, it } from 'vitest';
import { createRally, setRallyPoint } from '@/game/utilities';

describe('rally state', () => {
  it('starts with empty targetKey', () => {
    const rally = createRally();
    expect(rally.targetKey).toBe('');
  });

  it('setRallyPoint records the tile key', () => {
    const rally = createRally();
    setRallyPoint(rally, '3,4');
    expect(rally.targetKey).toBe('3,4');
  });

  it('overwrites a previous rally', () => {
    const rally = createRally();
    setRallyPoint(rally, '1,2');
    setRallyPoint(rally, '7,8');
    expect(rally.targetKey).toBe('7,8');
  });

  it('accepts an empty string to clear the rally', () => {
    const rally = createRally();
    setRallyPoint(rally, '5,6');
    setRallyPoint(rally, '');
    expect(rally.targetKey).toBe('');
  });
});
