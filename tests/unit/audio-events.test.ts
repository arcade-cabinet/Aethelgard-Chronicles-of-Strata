import { describe, expect, it } from 'vitest';
import { SOUND_FOR_EVENT, type GameAudioEvent } from '@/audio/sound-map';

describe('event-sound map', () => {
  it('maps every game audio event to a sound id', () => {
    const events: GameAudioEvent[] = [
      'combat-hit',
      'combat-crit',
      'harvest-chop',
      'resource-deposit',
      'unit-select',
      'building-placed',
      'building-completed',
      'ui-button-click',
      'ui-panel-open',
      'research-purchased',
      'victory',
      'defeat',
    ];
    for (const e of events) {
      expect(SOUND_FOR_EVENT[e]).toBeTruthy();
    }
  });

  it('routes combat-crit to sfx bus with magic-impact sound', () => {
    expect(SOUND_FOR_EVENT['combat-crit'].bus).toBe('sfx');
    expect(SOUND_FOR_EVENT['combat-crit'].soundId).toBe('audio.sfx.magic-impact');
  });

  it('routes all UI events to ui bus', () => {
    const uiEvents: GameAudioEvent[] = ['ui-button-click', 'ui-panel-open', 'unit-select'];
    for (const e of uiEvents) {
      expect(SOUND_FOR_EVENT[e].bus).toBe('ui');
    }
  });

  it('routes research-purchased to ui bus', () => {
    expect(SOUND_FOR_EVENT['research-purchased'].bus).toBe('ui');
    expect(SOUND_FOR_EVENT['research-purchased'].soundId).toBe('audio.sfx.ui-unlock');
  });

  it('routes building-completed to sfx bus', () => {
    expect(SOUND_FOR_EVENT['building-completed'].bus).toBe('sfx');
    expect(SOUND_FOR_EVENT['building-completed'].soundId).toBe('audio.sfx.ui-achievement');
  });
});
