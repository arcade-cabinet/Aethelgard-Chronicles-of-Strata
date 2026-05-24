import { describe, expect, it } from 'vitest';
import {
  computeTerrainBonus,
  HIGH_GROUND_MULTIPLIER,
  LOW_GROUND_MULTIPLIER,
  terrainBonusLabel,
} from '@/rules/terrain-bonus';

/**
 * M_POLISH2.RTS.20 — terrain combat bonus. Pure-function contract.
 */
describe('M_POLISH2.RTS.20 — terrain bonus', () => {
  it('attacker on higher level → high-ground bonus', () => {
    expect(computeTerrainBonus(2, 0)).toBe(HIGH_GROUND_MULTIPLIER);
    expect(computeTerrainBonus(1, 0)).toBe(HIGH_GROUND_MULTIPLIER);
  });

  it('attacker on lower level → low-ground penalty', () => {
    expect(computeTerrainBonus(0, 2)).toBe(LOW_GROUND_MULTIPLIER);
    expect(computeTerrainBonus(0, 1)).toBe(LOW_GROUND_MULTIPLIER);
  });

  it('same level → 1.0 (no modifier)', () => {
    expect(computeTerrainBonus(0, 0)).toBe(1);
    expect(computeTerrainBonus(2, 2)).toBe(1);
  });

  it('high-ground multiplier > low-ground multiplier (offense favoured)', () => {
    // 1.25 / 0.85 ~ 1.47x swing — the GAIN beats the LOSS.
    expect(HIGH_GROUND_MULTIPLIER / LOW_GROUND_MULTIPLIER).toBeGreaterThan(1.4);
  });

  it('terrainBonusLabel surfaces a HUD-readable pill string', () => {
    expect(terrainBonusLabel(HIGH_GROUND_MULTIPLIER)).toContain('+25%');
    expect(terrainBonusLabel(LOW_GROUND_MULTIPLIER)).toContain('-15%');
    expect(terrainBonusLabel(1)).toBeNull();
  });
});
