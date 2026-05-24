import { describe, expect, it } from 'vitest';
import metadata from '@/config/asset-metadata.json' with { type: 'json' };
import { resolveSoundId, SOUND_FOR_EVENT } from '@/audio/sound-map';

/**
 * M_EXPANSION.T.131 — every GameAudioEvent in SOUND_FOR_EVENT must
 * resolve to a real asset id present in the manifest, on a valid
 * bus. Today's contract is "exactly one AudioNode connection" per
 * event — verifying the asset-id resolution is the unit-test layer
 * of that contract. Browser tests cover the actual Howl construction.
 */
const VALID_BUSES = new Set(['sfx', 'music', 'ambient', 'ui']);

describe('M_EXPANSION.T.131 — audio sound-map contract', () => {
  it('every SOUND_FOR_EVENT entry has a valid bus', () => {
    for (const [event, mapping] of Object.entries(SOUND_FOR_EVENT)) {
      expect(VALID_BUSES.has(mapping.bus), `event ${event}: bus ${mapping.bus}`).toBe(true);
    }
  });

  it('every SOUND_FOR_EVENT entry resolves to an asset id present in the manifest', () => {
    const manifestIds = new Set(Object.keys(metadata as Record<string, unknown>));
    for (const [event, mapping] of Object.entries(SOUND_FOR_EVENT)) {
      const id = resolveSoundId(mapping);
      expect(id, `event ${event}: resolved id ${id}`).not.toBe('');
      // For variant pools (soundIds), resolveSoundId picks one — make
      // sure ALL declared variants are valid too, not just whichever
      // gets picked on this run.
      const ids = mapping.soundIds ?? [mapping.soundId ?? id];
      for (const i of ids) {
        expect(i, `event ${event}: variant id ${i} must be string`).toBeTruthy();
        expect(manifestIds.has(i), `event ${event}: variant id ${i} not in manifest`).toBe(true);
      }
    }
  });

  it('SOUND_FOR_EVENT covers at least the core gameplay event surface', () => {
    // Spot-check that the spec-pivotal events exist in the map.
    const requiredEvents = [
      'combat-hit',
      'combat-hit-magic',
      'combat-hit-siege',
      'combat-crit',
      'magic-cast',
      'unit-death-normal',
      'unit-death-magic',
      'unit-death-siege',
      'harvest-chop',
      'harvest-mine',
      'building-placed',
      'building-completed',
      'victory',
      'defeat',
    ];
    for (const e of requiredEvents) {
      expect(SOUND_FOR_EVENT, `required event ${e}`).toHaveProperty(e);
    }
  });
});
