/**
 * M_V12.DEPTH.MILITARY-CHAIN — pin the Military 16-entry shape.
 *
 * 4 tiers × 4 specs (infantry / archer / siege / cavalry).
 */
import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '@/rules/discovery-registry';

const MILITARY_IDS = {
  infantry: ['forgedBlades', 'tempered-edges', 'phalanx-doctrine', 'imperial-guard'] as const,
  archer: ['iron-tipped-arrows', 'composite-bows', 'volley-fire', 'masterwork-bows'] as const,
  siege: [
    'sapper-training',
    'catapult-blueprints',
    'reinforced-trebuchets',
    'seismic-engines',
  ] as const,
  cavalry: ['armored-saddles', 'barbed-spears', 'charge-tactics', 'royal-cavalry'] as const,
} as const;

describe('M_V12.DEPTH.MILITARY-CHAIN — 16-entry pin', () => {
  it('every Military id is present', () => {
    const known = new Set(DISCOVERIES.map((d) => d.id));
    for (const spec of Object.keys(MILITARY_IDS) as Array<keyof typeof MILITARY_IDS>) {
      for (const id of MILITARY_IDS[spec]) expect(known.has(id)).toBe(true);
    }
  });

  it('every spec tier-chains via prereqs', () => {
    for (const spec of Object.keys(MILITARY_IDS) as Array<keyof typeof MILITARY_IDS>) {
      const ids = MILITARY_IDS[spec];
      for (let i = 1; i < ids.length; i += 1) {
        const cur = DISCOVERIES.find((d) => d.id === ids[i]);
        expect(cur?.prereqs ?? []).toContain(ids[i - 1]);
      }
    }
  });

  it('every tier-1 head is standalone', () => {
    for (const spec of Object.keys(MILITARY_IDS) as Array<keyof typeof MILITARY_IDS>) {
      const t1 = DISCOVERIES.find((d) => d.id === MILITARY_IDS[spec][0]);
      expect(t1?.prereqs ?? []).toEqual([]);
    }
  });

  it('counts: 4 specs × 4 tiers = 16', () => {
    expect(Object.values(MILITARY_IDS).flat().length).toBe(16);
  });
});
