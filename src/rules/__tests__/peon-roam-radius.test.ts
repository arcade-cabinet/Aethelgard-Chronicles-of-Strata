/**
 * M_GAME.BUG.10 — peon roam-radius distance gate.
 *
 * Verifies the maxRoamRadius filter in nextPeonAction:
 * - With a generous radius (or undefined), the peon picks the
 *   absolute-nearest resource (legacy behavior).
 * - With a tight radius, the peon prefers an in-range resource
 *   over a closer out-of-range one.
 * - With no in-range resources, the peon idles instead of
 *   sprinting across the map.
 */
import { describe, expect, it } from 'vitest';
import { nextPeonAction, type PeonView, type ResourceSite } from '@/rules';

const peon: PeonView = {
  state: 'IDLE',
  q: 0,
  r: 0,
  targetKey: '',
  carrying: false,
};

const baseKey = '0,0';

function site(q: number, r: number): ResourceSite {
  return { q, r, key: `${q},${r}` };
}

describe('peon roam-radius (M_GAME.BUG.10)', () => {
  it('without maxRoamRadius, picks the closest resource regardless of base distance', () => {
    const sites = [site(20, 0), site(2, 0)];
    const action = nextPeonAction(peon, {
      resources: sites,
      baseKey,
      threatenedTiles: new Set(),
    });
    expect(action.kind).toBe('seek');
    if (action.kind !== 'seek') return;
    expect(action.targetKey).toBe('2,0');
  });

  it('with maxRoamRadius=5, ignores the out-of-range node even if it is closer to the peon', () => {
    const sites = [site(8, 0), site(4, 0)]; // both farther from base than peon
    const action = nextPeonAction(peon, {
      resources: sites,
      baseKey,
      threatenedTiles: new Set(),
      maxRoamRadius: 5,
    });
    expect(action.kind).toBe('seek');
    if (action.kind !== 'seek') return;
    // 8 is out of range; 4 is in range.
    expect(action.targetKey).toBe('4,0');
  });

  it('with no in-range resources, the peon idles instead of seeking', () => {
    const sites = [site(20, 0), site(30, 0)];
    const action = nextPeonAction(peon, {
      resources: sites,
      baseKey,
      threatenedTiles: new Set(),
      maxRoamRadius: 5,
    });
    expect(action.kind).toBe('idle');
  });
});
