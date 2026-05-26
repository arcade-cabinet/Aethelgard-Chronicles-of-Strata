/**
 * M_GAME.BUG.10 — peon roam-radius distance gate.
 *
 * The filter itself is hoisted into the caller (job-routing.ts) per
 * the post-CI perf revision (pre-filtered once per tick, not per
 * peon). These tests still document the END contract: when the
 * caller passes a filtered list, the picker behaves correctly.
 *
 * - Picker chooses the closest entry in the supplied list.
 * - Picker idles when the supplied list is empty (the radius
 *   has zero matches).
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
  it('picker chooses the closest entry in the supplied list', () => {
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

  it('picker prefers the in-range entry when the caller filtered out the closer-to-peon-but-farther-from-base node', () => {
    // The caller (jobRoutingSystem) is responsible for filtering;
    // here we simulate "the radius cap removed the 8,0 node."
    const sites = [site(4, 0)];
    const action = nextPeonAction(peon, {
      resources: sites,
      baseKey,
      threatenedTiles: new Set(),
    });
    expect(action.kind).toBe('seek');
    if (action.kind !== 'seek') return;
    expect(action.targetKey).toBe('4,0');
  });

  it('picker idles when the supplied (filtered) list is empty', () => {
    const action = nextPeonAction(peon, {
      resources: [],
      baseKey,
      threatenedTiles: new Set(),
    });
    expect(action.kind).toBe('idle');
  });
});
