import { afterEach, describe, expect, it } from 'vitest';
import {
  _resetBusVolumesForTests,
  createAudioBuses,
  getBusVolume,
  setBusVolume,
} from '@/audio/buses';

/**
 * M_EXPANSION.U.112 — per-bus volume registry contract.
 *
 * The SettingsModal sliders write through `setBusVolume`. The audio
 * subsystem reads back via `getBusVolume` and through the bus.volume
 * field on live AudioBuses instances. This test pins:
 *   - reads default to the original makeBus values
 *   - writes clamp to [0,1]
 *   - writes propagate to live buses that already exist
 *   - subsequently-created buses adopt the persisted volume
 */
describe('M_EXPANSION.U.112 — per-bus volume API', () => {
  afterEach(() => {
    _resetBusVolumesForTests();
  });

  it('starts at the documented defaults', () => {
    expect(getBusVolume('sfx')).toBe(0.8);
    expect(getBusVolume('music')).toBe(0.5);
    expect(getBusVolume('ambient')).toBe(0.4);
    expect(getBusVolume('ui')).toBe(0.9);
  });

  it('clamps writes to [0, 1]', () => {
    setBusVolume('sfx', 1.5);
    expect(getBusVolume('sfx')).toBe(1);
    setBusVolume('sfx', -0.2);
    expect(getBusVolume('sfx')).toBe(0);
  });

  it('a write propagates to a bus instance that was already created', () => {
    const buses = createAudioBuses();
    expect(buses.music.volume).toBe(0.5);
    setBusVolume('music', 0.25);
    expect(buses.music.volume).toBe(0.25);
  });

  it('a bus instance created AFTER the write adopts the persisted volume', () => {
    setBusVolume('ambient', 0.1);
    const buses = createAudioBuses();
    expect(buses.ambient.volume).toBe(0.1);
  });

  it('a write to one bus does not bleed into a sibling bus', () => {
    const buses = createAudioBuses();
    setBusVolume('sfx', 0.2);
    expect(buses.music.volume).toBe(0.5);
    expect(buses.ambient.volume).toBe(0.4);
    expect(buses.ui.volume).toBe(0.9);
  });
});
