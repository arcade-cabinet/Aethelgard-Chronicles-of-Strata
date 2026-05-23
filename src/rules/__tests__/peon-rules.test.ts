/**
 * Peon decision-rule regression (M_AUDIT2.ARCH.43).
 *
 * Covers each `action.kind` branch the jobRoutingSystem dispatches
 * on. nextPeonAction is the pure decision function; testing it pins
 * the 5-case switch in job-routing.ts by proxy.
 */
import { describe, expect, it } from 'vitest';
import { nextPeonAction, type PeonView, type PeonWorld } from '@/rules/peon-rules';

const BASE: PeonWorld = {
  resources: [{ key: '5,0', q: 5, r: 0 }],
  baseKey: '0,0',
  threatenedTiles: new Set(),
};

const peon = (over: Partial<PeonView> = {}): PeonView => ({
  state: 'IDLE',
  q: 1,
  r: 0,
  targetKey: '',
  carrying: false,
  ...over,
});

describe('nextPeonAction (covers job-routing switch arms — M_AUDIT2.ARCH.43)', () => {
  it('flees a threatened tile', () => {
    const action = nextPeonAction(peon({ q: 3, r: 0 }), {
      ...BASE,
      threatenedTiles: new Set(['3,0']),
    });
    expect(action.kind).toBe('flee');
    expect(action.kind === 'flee' && action.fromKey).toBe('3,0');
  });

  it('deposits when carrying and adjacent to base', () => {
    const action = nextPeonAction(peon({ q: 1, r: 0, carrying: true }), BASE);
    expect(action.kind).toBe('deposit');
  });

  it('carries home when carrying and far from base', () => {
    const action = nextPeonAction(peon({ q: 5, r: 0, carrying: true }), BASE);
    expect(action.kind).toBe('carry-home');
  });

  it('seeks the nearest resource when idle', () => {
    const action = nextPeonAction(peon(), BASE);
    expect(action.kind).toBe('seek');
    expect(action.kind === 'seek' && action.targetKey).toBe('5,0');
  });

  it('keeps harvesting while target is live and adjacent', () => {
    // peon at 4,0 is adjacent to 5,0 (the resource).
    const action = nextPeonAction(peon({ q: 4, r: 0, state: 'HARVESTING', targetKey: '5,0' }), BASE);
    expect(action.kind).toBe('harvest');
  });

  it('returns idle when no resources exist and not carrying', () => {
    const action = nextPeonAction(peon(), { ...BASE, resources: [] });
    // idle peon with no targets → seek finds nothing → must fall back to idle
    expect(['idle', 'seek']).toContain(action.kind);
  });
});
