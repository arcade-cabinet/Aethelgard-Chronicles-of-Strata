import { describe, expect, it } from 'vitest';
import { SOUND_FOR_EVENT, type GameAudioEvent } from '@/audio/sound-map';

describe('event-sound map', () => {
  it('maps every game audio event to a sound id', () => {
    const events: GameAudioEvent[] = [
      'combat-hit',
      'harvest-chop',
      'resource-deposit',
      'unit-select',
      'building-placed',
      'victory',
      'defeat',
    ];
    for (const e of events) {
      expect(SOUND_FOR_EVENT[e]).toBeTruthy();
    }
  });
});
