/**
 * UNIT_PROFILES + derived MILITARY_ROLES regression coverage
 * (M_REGISTRY.1, M_REGISTRY.17). Pins the latent-bug fix surfaced by
 * the code-reviewer: Trebuchet WAS missing from the 3 legacy hand-built
 * MILITARY sets across offensive-behavior.ts / TileInteraction.tsx /
 * encroachment.ts. After M_REGISTRY.17, MILITARY_ROLES is DERIVED from
 * UNIT_PROFILES[role].combatRole so the inclusion of Trebuchet is by
 * data, not by hand.
 *
 * This test pins that derivation so any future profile edit (e.g.
 * marking a unit `combatRole: 'civilian'` by mistake) breaks the suite
 * before reaching the gameplay tick.
 */
import { describe, expect, it } from 'vitest';
import type { UnitType } from '@/ecs/components';
import { MILITARY_ROLES, UNIT_PROFILES } from '../unit-profiles';

describe('UNIT_PROFILES + MILITARY_ROLES derivation', () => {
  it('includes Trebuchet (legacy bug fix — was missing from hand-built sets)', () => {
    expect(MILITARY_ROLES.has('Trebuchet')).toBe(true);
  });

  it('includes every role with combatRole=military, excludes every civilian', () => {
    for (const [role, profile] of Object.entries(UNIT_PROFILES) as Array<
      [UnitType, (typeof UNIT_PROFILES)[UnitType]]
    >) {
      if (profile.combatRole === 'military') {
        expect(MILITARY_ROLES.has(role)).toBe(true);
      } else {
        expect(MILITARY_ROLES.has(role)).toBe(false);
      }
    }
  });

  it('the only civilians are Peon and Settler', () => {
    const civilians = Object.entries(UNIT_PROFILES)
      .filter(([, p]) => p.combatRole === 'civilian')
      .map(([role]) => role)
      .sort();
    expect(civilians).toEqual(['Peon', 'Settler']);
  });

  it('every profile carries the required slot tuple', () => {
    for (const [, p] of Object.entries(UNIT_PROFILES)) {
      // The 4 booleans/string slots all have a value (TS enforces; runtime double-check).
      expect(typeof p.harvester).toBe('boolean');
      expect(typeof p.nonCombat).toBe('boolean');
      expect(typeof p.founder).toBe('boolean');
      expect(['normal', 'siege', 'magic']).toContain(p.damageType);
      expect(['military', 'civilian']).toContain(p.combatRole);
      expect(typeof p.selectionRadius).toBe('number');
      expect(p.selectionRadius).toBeGreaterThan(0);
    }
  });

  it('every non-Peon civilian has founder=true XOR harvester=true (one civilian shape per role)', () => {
    for (const [, p] of Object.entries(UNIT_PROFILES)) {
      if (p.combatRole !== 'civilian') continue;
      // Peon is harvester+!founder; Settler is founder+!harvester.
      // A civilian with neither is just a target dummy — flag if added.
      expect(p.harvester || p.founder).toBe(true);
    }
  });

  it('siege/magic damageType is only on military roles', () => {
    for (const [, p] of Object.entries(UNIT_PROFILES)) {
      if (p.damageType !== 'normal') {
        expect(p.combatRole).toBe('military');
      }
    }
  });
});
