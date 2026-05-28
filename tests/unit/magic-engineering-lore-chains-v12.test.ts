/**
 * M_V12.DEPTH.MAGIC-CHAIN + .ENGINEERING-CHAIN + .LORE-CHAIN —
 * pin the 12+12+8 = 32-entry shape across the three remaining
 * chains.
 */
import { describe, expect, it } from 'vitest';
import { DISCOVERIES } from '@/rules/discovery-registry';

const MAGIC_IDS: Record<string, ReadonlyArray<string>> = {
  offense: ['mage-tower-aura', 'crystalline-foci', 'elemental-mastery', 'apocalypse-rite'],
  utility: ['scrying-orb', 'translocation-rune', 'warding-circle', 'mirror-image'],
  summon: ['spirit-binding', 'druid-conclave', 'summon-elementals', 'necromancers-pact'],
};

const ENGINEERING_IDS: Record<string, ReadonlyArray<string>> = {
  siege: ['hammer-honing', 'siege-blueprints', 'engineering-corps', 'grand-armory'],
  defense: ['reinforced-walls', 'crenellations', 'bastion-architecture', 'impregnable-citadel'],
  production: [
    'workshop-discipline',
    'guild-conduits',
    'monumental-architecture',
    'guild-monopoly',
  ],
};

const LORE_IDS: Record<string, ReadonlyArray<string>> = {
  reveal: ['cartography', 'scout-doctrine', 'celestial-charts', 'omniscient-archives'],
  narrative: ['chronicle-keeping', 'bard-college', 'sage-council', 'chronicle-saga'],
};

function pinChain(
  label: string,
  table: Record<string, ReadonlyArray<string>>,
  expectedCount: number,
): void {
  describe(label, () => {
    it('every id is present', () => {
      const known = new Set(DISCOVERIES.map((d) => d.id));
      for (const spec of Object.keys(table)) {
        const ids = table[spec] ?? [];
        for (const id of ids) expect(known.has(id), `${spec} ${id}`).toBe(true);
      }
    });
    it('every spec tier-chains via prereqs', () => {
      for (const spec of Object.keys(table)) {
        const ids = table[spec] ?? [];
        for (let i = 1; i < ids.length; i += 1) {
          const cur = DISCOVERIES.find((d) => d.id === ids[i]);
          expect(cur?.prereqs ?? []).toContain(ids[i - 1]);
        }
      }
    });
    it('every spec tier-1 head is standalone', () => {
      for (const spec of Object.keys(table)) {
        const ids = table[spec] ?? [];
        const t1 = DISCOVERIES.find((d) => d.id === ids[0]);
        expect(t1?.prereqs ?? []).toEqual([]);
      }
    });
    it(`counts ${expectedCount}`, () => {
      expect(Object.values(table).flat().length).toBe(expectedCount);
    });
  });
}

pinChain('M_V12.DEPTH.MAGIC-CHAIN — 12-entry pin', MAGIC_IDS, 12);
pinChain('M_V12.DEPTH.ENGINEERING-CHAIN — 12-entry pin', ENGINEERING_IDS, 12);
pinChain('M_V12.DEPTH.LORE-CHAIN — 8-entry pin', LORE_IDS, 8);
