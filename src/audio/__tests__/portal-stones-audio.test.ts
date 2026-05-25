/**
 * M_V8.PORTAL-STONE.AUDIO — portal-stones-placed sound map entry.
 *
 * Asserts the event is registered in SOUND_FOR_EVENT + captions.
 * The window-event listener in useAudio.ts is not tested here (needs
 * a browser harness) — this pins the map entries so the type validator
 * catches any future soundId drift.
 */
import { describe, expect, it } from 'vitest';
import { SOUND_FOR_EVENT } from '@/audio/sound-map';
import { CAPTIONS_FOR_EVENT } from '@/hud/captions';

describe('M_V8.PORTAL-STONE.AUDIO — sound map', () => {
  it('portal-stones-placed entry exists in SOUND_FOR_EVENT', () => {
    expect('portal-stones-placed' in SOUND_FOR_EVENT).toBe(true);
  });

  it('portal-stones-placed uses sfx bus', () => {
    expect(SOUND_FOR_EVENT['portal-stones-placed'].bus).toBe('sfx');
  });

  it('portal-stones-placed soundId is non-empty', () => {
    const entry = SOUND_FOR_EVENT['portal-stones-placed'];
    const id = entry.soundId ?? entry.soundIds?.[0] ?? '';
    expect(id.length).toBeGreaterThan(0);
  });

  it('portal-stones-placed has a caption', () => {
    expect(CAPTIONS_FOR_EVENT['portal-stones-placed'].length).toBeGreaterThan(0);
  });
});
