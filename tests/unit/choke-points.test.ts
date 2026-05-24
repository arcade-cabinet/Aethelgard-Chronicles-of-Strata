import { describe, expect, it } from 'vitest';
import {
  CHOKE_MAX_NEIGHBOURS,
  CHOKE_REDUCTION,
  chokePointLabel,
  chokePointMultiplier,
} from '@/rules/choke-points';

/**
 * M_POLISH2.RTS.21 — choke-point defender bonus. Pure-function contract.
 */
describe('M_POLISH2.RTS.21 — choke-point multiplier', () => {
  it('a tile with 0 passable neighbours is a choke (isolated pocket)', () => {
    expect(chokePointMultiplier(0)).toBe(1 - CHOKE_REDUCTION);
  });

  it(`a tile with ≤${CHOKE_MAX_NEIGHBOURS} passable neighbours is a choke`, () => {
    expect(chokePointMultiplier(1)).toBe(1 - CHOKE_REDUCTION);
    expect(chokePointMultiplier(2)).toBe(1 - CHOKE_REDUCTION);
  });

  it(`a tile with >${CHOKE_MAX_NEIGHBOURS} passable neighbours is NOT a choke`, () => {
    expect(chokePointMultiplier(3)).toBe(1);
    expect(chokePointMultiplier(4)).toBe(1);
    expect(chokePointMultiplier(6)).toBe(1); // hex has 6 neighbours max
  });

  it('reduction value is the documented 10%', () => {
    expect(CHOKE_REDUCTION).toBe(0.1);
  });

  it('label only renders for an active choke multiplier', () => {
    expect(chokePointLabel(chokePointMultiplier(1))).toContain('-10%');
    expect(chokePointLabel(chokePointMultiplier(3))).toBeNull();
    expect(chokePointLabel(1)).toBeNull();
  });
});
