import { describe, expect, it } from 'vitest';
import { nextPeonAction, type PeonView, type PeonWorld } from '@/rules';

/** A baseline world: one resource at 5,0, base at 0,0, nothing threatened. */
function world(overrides: Partial<PeonWorld> = {}): PeonWorld {
  return {
    resources: [{ key: '5,0', q: 5, r: 0 }],
    baseKey: '0,0',
    threatenedTiles: new Set(),
    ...overrides,
  };
}

/** A baseline peon at the origin. */
function peon(overrides: Partial<PeonView> = {}): PeonView {
  return { state: 'IDLE', q: 0, r: 0, targetKey: '', carrying: false, ...overrides };
}

describe('nextPeonAction (M8.6c, spec 101)', () => {
  it('an idle peon seeks the nearest live resource', () => {
    const action = nextPeonAction(peon({ state: 'IDLE' }), world());
    expect(action).toEqual({ kind: 'seek', targetKey: '5,0' });
  });

  it('a seeking peon adjacent to its target harvests', () => {
    // peon at 4,0 is adjacent to the resource at 5,0
    const action = nextPeonAction(
      peon({ state: 'SEEKING', q: 4, r: 0, targetKey: '5,0' }),
      world(),
    );
    expect(action.kind).toBe('harvest');
  });

  it('a carrying peon adjacent to base deposits', () => {
    // peon at 1,0 is adjacent to the base at 0,0
    const action = nextPeonAction(peon({ state: 'CARRYING', q: 1, r: 0, carrying: true }), world());
    expect(action.kind).toBe('deposit');
  });

  it('a carrying peon far from base carries home', () => {
    const action = nextPeonAction(peon({ state: 'CARRYING', q: 9, r: 9, carrying: true }), world());
    expect(action.kind).toBe('carry-home');
  });

  it('a peon on a threatened tile flees — peons are nonviolent', () => {
    const action = nextPeonAction(
      peon({ state: 'HARVESTING', q: 5, r: 0, targetKey: '5,0' }),
      world({ threatenedTiles: new Set(['5,0']) }),
    );
    expect(action).toEqual({ kind: 'flee', fromKey: '5,0' });
  });

  it('a peon never seeks a resource on a threatened tile', () => {
    const action = nextPeonAction(
      peon({ state: 'IDLE' }),
      world({ threatenedTiles: new Set(['5,0']) }),
    );
    expect(action.kind).toBe('idle');
  });

  it('a peon whose target depleted re-seeks the next nearest', () => {
    // peon was harvesting 5,0 but it is gone; a new resource at 2,0 exists
    const action = nextPeonAction(
      peon({ state: 'HARVESTING', q: 4, r: 0, targetKey: '5,0' }),
      world({ resources: [{ key: '2,0', q: 2, r: 0 }] }),
    );
    expect(action).toEqual({ kind: 'seek', targetKey: '2,0' });
  });

  it('an idle peon with no reachable resource idles', () => {
    const action = nextPeonAction(peon({ state: 'IDLE' }), world({ resources: [] }));
    expect(action.kind).toBe('idle');
  });
});
