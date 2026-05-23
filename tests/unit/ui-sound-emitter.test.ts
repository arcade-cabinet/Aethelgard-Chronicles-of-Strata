import { describe, expect, it, vi } from 'vitest';

// Stub howler before importing audio modules that reference it.
vi.mock('howler', () => ({
  Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), loop: vi.fn() })),
  Howler: { mute: vi.fn(), volume: vi.fn() },
}));

// Stub assets.url so the bus doesn't need a real manifest.
vi.mock('@/assets/assets', () => ({
  assets: { url: (id: string) => `/assets/${id}` },
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

  it('calls playSound after registration', () => {
    const buses = createAudioBuses();
    const unregister = registerUiSoundPlayer(buses);

    emitUiSound('ui-button-click');
    expect(playSound).toHaveBeenCalledWith(buses, 'ui', 'audio.sfx.ui-click');

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
