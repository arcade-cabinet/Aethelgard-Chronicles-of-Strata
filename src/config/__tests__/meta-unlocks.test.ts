/**
 * M_V11.META-PROGRESSION — pin the meta-unlock registry shape.
 *
 * Tests against the loaded registry (which validates the JSON via
 * zod at module-load time). A malformed JSON entry would throw at
 * import; these tests verify the AUDIT-spec'd shape downstream.
 */
import { describe, expect, it } from 'vitest';
import {
  loreTokenReward,
  META_UNLOCKS,
  META_UNLOCKS_BY_ID,
  metaUnlocksByCategory,
} from '@/config/progression';

describe('M_V11.META-PROGRESSION — meta-unlock registry', () => {
  it('contains at least 30 unlocks (per GAME-DESIGN-AUDIT task #77c)', () => {
    expect(META_UNLOCKS.length).toBeGreaterThanOrEqual(30);
  });

  it('every entry has a unique id', () => {
    const ids = new Set<string>();
    for (const u of META_UNLOCKS) {
      expect(ids.has(u.id), `duplicate id: ${u.id}`).toBe(false);
      ids.add(u.id);
    }
  });

  it('every category has at least 5 entries (chains of meaningful progression)', () => {
    const grouped = metaUnlocksByCategory();
    for (const [cat, unlocks] of grouped) {
      expect(unlocks.length, `category ${cat} should have ≥5 entries`).toBeGreaterThanOrEqual(5);
    }
  });

  it('META_UNLOCKS_BY_ID is consistent with META_UNLOCKS', () => {
    for (const u of META_UNLOCKS) {
      expect(META_UNLOCKS_BY_ID.get(u.id)).toBe(u);
    }
  });

  it('every cost is a positive integer', () => {
    for (const u of META_UNLOCKS) {
      expect(Number.isInteger(u.cost), `${u.id} cost`).toBe(true);
      expect(u.cost, `${u.id} cost`).toBeGreaterThan(0);
    }
  });
});

describe('M_V11.META-PROGRESSION — loreTokenReward', () => {
  it('returns 0 for loss + draw regardless of difficulty', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      expect(loreTokenReward('loss', diff)).toBe(0);
      expect(loreTokenReward('draw', diff)).toBe(0);
    }
  });

  it('rewards 1/2/3 tokens for win on easy/normal/hard', () => {
    expect(loreTokenReward('win', 'easy')).toBe(1);
    expect(loreTokenReward('win', 'normal')).toBe(2);
    expect(loreTokenReward('win', 'hard')).toBe(3);
  });
});
