/**
 * M_PIVOT.ARCHETYPES — substrate tests for the archetypes registry.
 *
 * Pins:
 *   (1) Module load succeeds — Zod schema validates archetypes.json.
 *   (2) Four archetypes present: medieval, orc, undead, mystic.
 *   (3) Every archetype carries the full BuildingType set for v0.5.
 *   (4) archetypeFor() throws on unknown id with a helpful message.
 *   (5) buildingMeshFor() returns the mesh shape for known building,
 *       null for unknown building (graceful fallback contract).
 *   (6) Particle palette colors are valid 7-char lowercase hex.
 */
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, archetypeFor, buildingMeshFor } from '@/config/archetypes';
import type { FactionArchetype } from '@/config/factions';

const EXPECTED_ARCHETYPES = ['medieval', 'orc', 'undead', 'mystic'] as const;
const EXPECTED_BUILDINGS = [
  'TownHall',
  'Farm',
  'House',
  'Granary',
  'Barracks',
  'Watchtower',
  'Wall',
  'Wonder',
  'Library',
] as const;

describe('ARCHETYPES registry', () => {
  it('loads + validates the JSON at module load (no throw)', () => {
    expect(ARCHETYPES).toBeDefined();
    expect(Object.keys(ARCHETYPES).length).toBe(EXPECTED_ARCHETYPES.length);
  });

  it('contains all four declared archetypes', () => {
    for (const id of EXPECTED_ARCHETYPES) {
      expect(ARCHETYPES[id]).toBeDefined();
      expect(ARCHETYPES[id]?.displayName).toBeTruthy();
    }
  });

  it('every archetype carries the full v0.5 BuildingType set', () => {
    for (const id of EXPECTED_ARCHETYPES) {
      const a = ARCHETYPES[id];
      expect(a).toBeDefined();
      for (const building of EXPECTED_BUILDINGS) {
        expect(
          a?.buildings[building],
          `archetype "${id}" missing mesh for "${building}"`,
        ).toBeDefined();
      }
    }
  });

  it('every building mesh has positive scale + a non-empty meshLogicalId', () => {
    for (const id of EXPECTED_ARCHETYPES) {
      const a = ARCHETYPES[id];
      for (const building of EXPECTED_BUILDINGS) {
        const mesh = a?.buildings[building];
        expect(mesh).toBeDefined();
        expect(mesh!.meshLogicalId.length).toBeGreaterThan(0);
        expect(mesh!.scale).toBeGreaterThan(0);
      }
    }
  });

  it('every archetype has a valid particle palette', () => {
    const HEX_RE = /^#[0-9a-fA-F]{6}$/;
    for (const id of EXPECTED_ARCHETYPES) {
      const palette = ARCHETYPES[id]?.particlePalette;
      expect(palette).toBeDefined();
      expect(palette!.dust).toMatch(HEX_RE);
      expect(palette!.ember).toMatch(HEX_RE);
      expect(palette!.smoke).toMatch(HEX_RE);
    }
  });
});

describe('archetypeFor', () => {
  it('returns the matching archetype', () => {
    expect(archetypeFor('medieval').displayName).toBe('Medieval');
    expect(archetypeFor('orc').displayName).toBe('Orc');
  });

  it('throws on unknown id with a helpful message', () => {
    expect(() => archetypeFor('cybernetic' as FactionArchetype)).toThrow(
      /unknown archetype "cybernetic"/,
    );
  });
});

describe('buildingMeshFor', () => {
  it('returns the mesh shape for a known archetype + building', () => {
    const m = buildingMeshFor('medieval', 'TownHall');
    expect(m).not.toBeNull();
    expect(m!.meshLogicalId).toContain('town-center');
  });

  it('returns null for an unknown building (graceful fallback)', () => {
    expect(buildingMeshFor('medieval', 'CyberWell')).toBeNull();
  });

  it('throws when archetype itself is unknown (loud failure)', () => {
    expect(() => buildingMeshFor('martian' as FactionArchetype, 'House')).toThrow();
  });
});
