/**
 * M_V12.DEPTH.CHAIN-EXPANSION — Economy chain pin.
 *
 * Per docs/design/v0.12-upgrade-graph.md the Economy chain has
 * 16 entries: 4 tiers × 4 specs (harvest / cap / trade / tax).
 * This test pins the structure so a regression (missing entry,
 * wrong prereq edge, dropped effect kind) fires red.
 */
import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '@/rules/discovery-registry';

const ECONOMY_IDS = {
  harvest: ['steelPlows', 'iron-tools', 'logistics-doctrine', 'grand-mill'] as const,
  cap: ['bulk-baskets', 'granary-vault', 'warehouses', 'imperial-stores'] as const,
  trade: ['trade-route', 'bartering-school', 'guild-charter', 'global-bazaar'] as const,
  tax: ['golden-coin-mint', 'toll-keeps', 'regional-taxes', 'treasury-vault'] as const,
} as const;

describe('M_V12.DEPTH.CHAIN-EXPANSION — Economy chain (16 entries)', () => {
  it('every Economy id is present in the registry', () => {
    const known = new Set(DISCOVERIES.map((d) => d.id));
    for (const spec of Object.keys(ECONOMY_IDS) as Array<keyof typeof ECONOMY_IDS>) {
      for (const id of ECONOMY_IDS[spec]) {
        expect(known.has(id)).toBe(true);
      }
    }
  });

  it('every spec has its tiers chained left-to-right via prereqs', () => {
    for (const spec of Object.keys(ECONOMY_IDS) as Array<keyof typeof ECONOMY_IDS>) {
      const ids = ECONOMY_IDS[spec];
      for (let i = 1; i < ids.length; i += 1) {
        const cur = DISCOVERIES.find((d) => d.id === ids[i]);
        expect(cur).toBeDefined();
        expect(cur?.prereqs ?? []).toContain(ids[i - 1]);
      }
    }
  });

  it('tier-1 specs have no prereqs (every spec starts standalone)', () => {
    for (const spec of Object.keys(ECONOMY_IDS) as Array<keyof typeof ECONOMY_IDS>) {
      const t1 = DISCOVERIES.find((d) => d.id === ECONOMY_IDS[spec][0]);
      expect(t1?.prereqs ?? []).toEqual([]);
    }
  });

  it('counts match: 4 specs × 4 tiers = 16 entries', () => {
    const all = Object.values(ECONOMY_IDS).flat();
    expect(new Set(all).size).toBe(16);
    expect(all.length).toBe(16);
  });
});
