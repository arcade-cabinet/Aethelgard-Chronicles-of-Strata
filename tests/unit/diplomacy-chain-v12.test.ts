/**
 * M_V12.DEPTH.DIPLOMACY-CHAIN — pin the 12-entry shape (4 tiers ×
 * 3 specs: relations / trade / tribute).
 */
import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '@/rules/discovery-registry';

const DIPLO_IDS = {
  relations: ['first-contact', 'diplomatic-corps', 'royal-marriage', 'universal-amnesty'] as const,
  trade: ['exchange-policy', 'trade-treaty', 'shared-codex', 'trade-monopoly'] as const,
  tribute: ['levy-tradition', 'hostage-keep', 'extortion-doctrine', 'iron-fist'] as const,
} as const;

describe('M_V12.DEPTH.DIPLOMACY-CHAIN — 12-entry pin', () => {
  it('every Diplomacy id is present', () => {
    const known = new Set(DISCOVERIES.map((d) => d.id));
    for (const spec of Object.keys(DIPLO_IDS) as Array<keyof typeof DIPLO_IDS>) {
      for (const id of DIPLO_IDS[spec]) expect(known.has(id)).toBe(true);
    }
  });

  it('every spec tier-chains via prereqs', () => {
    for (const spec of Object.keys(DIPLO_IDS) as Array<keyof typeof DIPLO_IDS>) {
      const ids = DIPLO_IDS[spec];
      for (let i = 1; i < ids.length; i += 1) {
        const cur = DISCOVERIES.find((d) => d.id === ids[i]);
        expect(cur?.prereqs ?? []).toContain(ids[i - 1]);
      }
    }
  });

  it('every spec tier-1 is standalone', () => {
    for (const spec of Object.keys(DIPLO_IDS) as Array<keyof typeof DIPLO_IDS>) {
      const t1 = DISCOVERIES.find((d) => d.id === DIPLO_IDS[spec][0]);
      expect(t1?.prereqs ?? []).toEqual([]);
    }
  });

  it('counts: 3 specs × 4 tiers = 12 entries actually present in DISCOVERIES', () => {
    // CodeRabbit MINOR fix: bind the count to the registry, not
    // to the local DIPLO_IDS literal, so the test fails when the
    // registry-backed chain drifts.
    const ids = Object.values(DIPLO_IDS).flat();
    const present = ids.filter((id) => DISCOVERIES.some((d) => d.id === id));
    expect(present).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });
});
