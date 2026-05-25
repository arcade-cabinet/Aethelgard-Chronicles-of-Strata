/**
 * M_PIVOT.N-PLAYER.COLOR-PICKER — palette + default-shuffler tests.
 *
 * Pins:
 *   (1) The palette has exactly 12 chips with unique colors.
 *   (2) defaultFactionColors(n, seed) returns n distinct colors.
 *   (3) Same seed → same shuffle (deterministic).
 *   (4) Different seeds → likely different first picks (decorrelation).
 *   (5) normalizeHexColor accepts long + short hex, with/without #.
 *   (6) normalizeHexColor rejects junk + over-length input.
 */
import { describe, expect, it } from 'vitest';
import { defaultFactionColors, FACTION_PALETTE, normalizeHexColor } from '@/config/faction-palette';

describe('FACTION_PALETTE', () => {
  it('has 12 chips with unique colors', () => {
    expect(FACTION_PALETTE).toHaveLength(12);
    const colors = new Set(FACTION_PALETTE.map((c) => c.color.toLowerCase()));
    expect(colors.size).toBe(12);
  });

  it('every chip has unique id', () => {
    const ids = new Set(FACTION_PALETTE.map((c) => c.id));
    expect(ids.size).toBe(12);
  });

  it('every chip color is a 7-char lowercase hex', () => {
    for (const chip of FACTION_PALETTE) {
      expect(chip.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('defaultFactionColors', () => {
  it('returns n distinct colors for n <= 12', () => {
    for (const n of [1, 2, 4, 6, 12]) {
      const out = defaultFactionColors(n, 'alpha-bravo-charlie');
      expect(out).toHaveLength(n);
      const unique = new Set(out);
      expect(unique.size).toBe(n);
    }
  });

  it('clamps n > 12 to 12 (palette size)', () => {
    expect(defaultFactionColors(20, 'seed')).toHaveLength(12);
  });

  it('returns empty for n <= 0', () => {
    expect(defaultFactionColors(0, 'seed')).toEqual([]);
    expect(defaultFactionColors(-1, 'seed')).toEqual([]);
  });

  it('is deterministic — same seed → same shuffle', () => {
    const a = defaultFactionColors(6, 'silent-quiet-dawn');
    const b = defaultFactionColors(6, 'silent-quiet-dawn');
    expect(a).toEqual(b);
  });

  it('different seeds decorrelate (≥ 50% of seeds produce distinct first picks)', () => {
    // 100 seeds, count how many distinct first-picks appear.
    const firsts = new Set<string>();
    for (let i = 0; i < 100; i++) {
      firsts.add(defaultFactionColors(1, `seed-${i}`)[0] ?? '');
    }
    // At least half the palette should be hit as a first pick across 100 seeds.
    expect(firsts.size).toBeGreaterThanOrEqual(6);
  });
});

describe('normalizeHexColor', () => {
  it('accepts long form #rrggbb', () => {
    expect(normalizeHexColor('#3b82f6')).toBe('#3b82f6');
    expect(normalizeHexColor('#3B82F6')).toBe('#3b82f6');
  });

  it('accepts short form #rgb (expands to long form)', () => {
    expect(normalizeHexColor('#f00')).toBe('#ff0000');
    expect(normalizeHexColor('#0F0')).toBe('#00ff00');
  });

  it('accepts hex without leading #', () => {
    expect(normalizeHexColor('3b82f6')).toBe('#3b82f6');
    expect(normalizeHexColor('f00')).toBe('#ff0000');
  });

  it('trims whitespace', () => {
    expect(normalizeHexColor('  #3b82f6  ')).toBe('#3b82f6');
  });

  it('rejects junk', () => {
    expect(normalizeHexColor('hot pink')).toBeNull();
    expect(normalizeHexColor('#gggggg')).toBeNull();
    expect(normalizeHexColor('')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull(); // wrong length
    expect(normalizeHexColor('#1234567')).toBeNull(); // too long
  });
});
