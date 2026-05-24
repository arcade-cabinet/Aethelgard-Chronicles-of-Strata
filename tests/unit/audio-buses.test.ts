import { describe, expect, it, vi } from 'vitest';
import { _setInteractionGateForTests, createAudioBuses, playSoundAt, setMuted } from '@/audio/buses';

// howler touches the Web Audio API — stub it for the node unit test.
// We capture stereo() + volume() calls so playSoundAt's spatial math
// is observable.
// vi.mock is hoisted; declarations inside the factory must be self-contained.
// We export the spies via vi.hoisted so the test body can reference them.
const audioSpies = vi.hoisted(() => ({
  mockStereo: vi.fn(),
  mockVolume: vi.fn(),
  mockPlay: vi.fn(() => 'play-id-1'),
  mockMute: vi.fn(),
  mockGlobalVolume: vi.fn(),
}));
vi.mock('howler', () => {
  class MockHowl {
    play = audioSpies.mockPlay;
    stop = vi.fn();
    loop = vi.fn();
    stereo = audioSpies.mockStereo;
    volume = audioSpies.mockVolume;
  }
  return {
    Howl: MockHowl,
    Howler: { mute: audioSpies.mockMute, volume: audioSpies.mockGlobalVolume },
  };
});
const { mockStereo, mockVolume, mockPlay, mockMute } = audioSpies;

describe('audio buses', () => {
  it('creates the four named buses', () => {
    const buses = createAudioBuses();
    expect(buses.sfx).toBeDefined();
    expect(buses.music).toBeDefined();
    expect(buses.ambient).toBeDefined();
    expect(buses.ui).toBeDefined();
  });

  it('setMuted toggles the global Howler mute', () => {
    setMuted(true);
    expect(mockMute).toHaveBeenCalledWith(true);
    setMuted(false);
    expect(mockMute).toHaveBeenCalledWith(false);
  });

  // M_EXPANSION.AU.48 — playSoundAt computes stereo pan + distance
  // attenuation from camera-relative geometry. Mocked Howl captures
  // the stereo() + volume() calls so we can verify the math.
  describe('playSoundAt — 3D-positional one-shot', () => {
    it('sound to the right of camera pans positive (right)', () => {
      _setInteractionGateForTests(true);
      mockStereo.mockClear();
      mockVolume.mockClear();
      const buses = createAudioBuses();
      // Camera at origin facing -Z (azimuth=0); world at (+10, +0, 0).
      // Right vector at azimuth=0 is (cos(0), -sin(0)) = (1, 0).
      // Dot product of (10, 0) with (1, 0) → +10 / dist=10 = +1 (full right pan).
      playSoundAt(buses, 'sfx', 'audio.sfx.hit', { x: 10, z: 0 }, { x: 0, z: 0 }, 0);
      expect(mockStereo).toHaveBeenCalledWith(1, expect.anything());
    });

    it('sound to the left of camera pans negative (left)', () => {
      _setInteractionGateForTests(true);
      mockStereo.mockClear();
      const buses = createAudioBuses();
      playSoundAt(buses, 'sfx', 'audio.sfx.hit', { x: -10, z: 0 }, { x: 0, z: 0 }, 0);
      expect(mockStereo).toHaveBeenCalledWith(-1, expect.anything());
    });

    it('distance-attenuates and skips when beyond MAX_DIST', () => {
      _setInteractionGateForTests(true);
      mockStereo.mockClear();
      mockPlay.mockClear();
      const buses = createAudioBuses();
      // Distance 100 > MAX_DIST(35) → silent → play() never called.
      playSoundAt(buses, 'sfx', 'audio.sfx.hit', { x: 0, z: 100 }, { x: 0, z: 0 }, 0);
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('does nothing when interaction gate is closed', () => {
      _setInteractionGateForTests(false);
      mockPlay.mockClear();
      const buses = createAudioBuses();
      playSoundAt(buses, 'sfx', 'audio.sfx.hit', { x: 0, z: 0 }, { x: 0, z: 0 }, 0);
      expect(mockPlay).not.toHaveBeenCalled();
      // re-open for any later test that depends on it
      _setInteractionGateForTests(true);
    });
  });
});
