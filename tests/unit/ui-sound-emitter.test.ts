import { describe, expect, it, vi } from 'vitest';

// Stub howler before importing audio modules that reference it.
vi.mock('howler', () => ({
  Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), loop: vi.fn() })),
  Howler: { mute: vi.fn(), volume: vi.fn() },
}));

// Stub assets so neither the bus URL resolution nor the sound-map
// module-load entry validation needs the real manifest. `entry` returns
// a synthetic AssetEntry — sound-map only checks that it doesn't throw.
vi.mock('@/assets/assets', () => ({
  assets: {
    url: (id: string) => `/assets/${id}`,
    entry: (id: string) => ({ id, path: `assets/${id}`, category: 'audio' }),
    idsInCategory: () => [],
  },
}));

import { createAudioBuses, playSound } from '@/audio/buses';
import { emitUiSound, registerUiSoundPlayer } from '@/audio/ui-sound-emitter';

vi.mock('@/audio/buses', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/audio/buses')>();
  return {
    ...actual,
    playSound: vi.fn(),
  };
});

describe('ui-sound-emitter', () => {
  it('is a no-op before registration', () => {
    // emitUiSound before any registration should not throw
    expect(() => emitUiSound('ui-button-click')).not.toThrow();
    expect(playSound).not.toHaveBeenCalled();
  });

  it('calls playSound after registration with a click-pool variant (M_EXPANSION.AU.35)', () => {
    const buses = createAudioBuses();
    const unregister = registerUiSoundPlayer(buses);

    emitUiSound('ui-button-click');
    // Variant pool — emitter picks one of three click variants at random.
    expect(playSound).toHaveBeenCalledWith(
      buses,
      'ui',
      expect.stringMatching(/^audio\.ui\.click-0[1-3]$/),
    );

    unregister();
  });

  it('is a no-op after unregistration', () => {
    const buses = createAudioBuses();
    const unregister = registerUiSoundPlayer(buses);
    unregister();

    vi.mocked(playSound).mockClear();
    emitUiSound('ui-panel-open');
    expect(playSound).not.toHaveBeenCalled();
  });

  it('routes research-purchased to ui bus discovery-unlock sound (M_EXPANSION.AU.34)', () => {
    const buses = createAudioBuses();
    const unregister = registerUiSoundPlayer(buses);

    emitUiSound('research-purchased');
    expect(playSound).toHaveBeenCalledWith(buses, 'ui', 'audio.ui.discovery-unlock');

    unregister();
  });
});
