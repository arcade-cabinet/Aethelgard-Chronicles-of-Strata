import { describe, expect, it, vi } from 'vitest';
import { createAudioBuses, setMuted } from '@/audio/buses';

// howler touches the Web Audio API — stub it for the node unit test
vi.mock('howler', () => ({
  Howl: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), loop: vi.fn() })),
  Howler: { mute: vi.fn(), volume: vi.fn() },
}));

describe('audio buses', () => {
  it('creates the four named buses', () => {
    const buses = createAudioBuses();
    expect(buses.sfx).toBeDefined();
    expect(buses.music).toBeDefined();
    expect(buses.ambient).toBeDefined();
    expect(buses.ui).toBeDefined();
  });

  it('setMuted toggles the global Howler mute', async () => {
    const { Howler } = await import('howler');
    setMuted(true);
    expect(Howler.mute).toHaveBeenCalledWith(true);
    setMuted(false);
    expect(Howler.mute).toHaveBeenCalledWith(false);
  });
});
