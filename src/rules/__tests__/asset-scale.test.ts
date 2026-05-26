/**
 * M_GAME.SCALE.GLB-MEASURE.1 — guards against scale-by-guess
 * regressions:
 * - SKINS-referenced logical ids resolve to entries in
 *   glb-metadata.json (so a typo or new asset that hasn't been
 *   measured surfaces in CI, not the dev's eye).
 * - Measured scales fall in plausible ranges per category
 *   (catches a future tool bug that would write zero / NaN /
 *   absurdly-large scales).
 * - Fallback path returns the supplied default on unknown ids.
 */
import { describe, expect, it } from 'vitest';
import { measuredScale, measuredYOffset, measuredEntry } from '../asset-scale';

describe('asset-scale (M_GAME.SCALE.GLB-MEASURE.1)', () => {
  it('returns measured scales for SKINS-referenced ids', () => {
    // M_V11.PROCMESH.GLB-CLEANUP — player/AI building GLBs were
    // removed (TownHall, Barracks, Wall, Farm, etc.) and now render
    // procedurally. Remaining SKINS-referenced GLBs are: horde-camp
    // graveyard kit (crypt, portal-crypt, gravestones) + baseProps
    // (banner-faction, fountain, iron-fence) + characters.
    const ids = [
      'structures.crypt',
      'structures.portal-crypt',
      'structures.banner-faction',
      'structures.fountain',
      'structures.iron-fence',
      'characters.heroes.knight',
      'characters.heroes.engineer',
      'characters.enemies.orc',
    ];
    for (const id of ids) {
      const entry = measuredEntry(id);
      expect(entry, `${id} must be measured (re-run pnpm assets:measure)`).toBeDefined();
      expect(measuredScale(id), `${id} scale must be > 0`).toBeGreaterThan(0);
      expect(measuredScale(id), `${id} scale must be < 5 (sanity)`).toBeLessThan(5);
    }
  });

  it('character scales target ~0.95 world-unit height (BBOX.sizeY × scale)', () => {
    const ids = [
      'characters.heroes.knight',
      'characters.heroes.engineer',
      'characters.enemies.orc',
    ];
    for (const id of ids) {
      const entry = measuredEntry(id);
      expect(entry, id).toBeDefined();
      const e = entry as NonNullable<typeof entry>;
      const sizeY = e.bbox.size[1] ?? 0;
      const heightInWorld = sizeY * e.scale;
      expect(heightInWorld).toBeCloseTo(0.95, 1);
    }
  });

  it('building scales target the building/prop footprints', () => {
    // M_V11.PROCMESH.GLB-CLEANUP — the only remaining structure GLBs
    // are graveyard kit (horde camps; crypt category) + baseProps.
    // Crypt targets the building footprint (~1.1).
    const id = 'structures.crypt';
    const entry = measuredEntry(id);
    expect(entry, id).toBeDefined();
    const e = entry as NonNullable<typeof entry>;
    const sizeX = e.bbox.size[0] ?? 0;
    const sizeZ = e.bbox.size[2] ?? 0;
    const footprint = Math.max(sizeX, sizeZ) * e.scale;
    expect(footprint).toBeCloseTo(1.1, 1);
  });

  it('returns fallback for unknown ids', () => {
    expect(measuredScale('does.not.exist', 0.42)).toBe(0.42);
    expect(measuredYOffset('also.not.real', 0.07)).toBe(0.07);
    expect(measuredEntry('nope')).toBeUndefined();
  });
});
