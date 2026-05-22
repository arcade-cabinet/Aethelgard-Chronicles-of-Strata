/**
 * Howler audio buses — sfx, music, ambient, ui.
 *
 * Each bus lazily constructs a `Howl` instance per sound id and caches it.
 * `playMusic` stops the currently-playing music track before starting the new
 * one (only one music track plays at a time).
 *
 * Source: docs/specs/80-audio.md §Audio Buses
 */
import { Howl, Howler } from 'howler';
import { assets } from '@/assets/assets';

/** A named audio bus. */
export interface AudioBus {
  /** Name of the bus (for debugging). */
  name: string;
  /** Per-bus volume, 0–1. */
  volume: number;
  /** Cache of lazily-constructed Howl instances keyed by asset id. */
  cache: Map<string, Howl>;
}

/** The four application audio buses. */
export interface AudioBuses {
  sfx: AudioBus;
  music: AudioBus;
  ambient: AudioBus;
  ui: AudioBus;
}

function makeBus(name: string, volume: number): AudioBus {
  return { name, volume, cache: new Map() };
}

/** Create the four named audio buses. */
export function createAudioBuses(): AudioBuses {
  return {
    sfx: makeBus('sfx', 0.8),
    music: makeBus('music', 0.5),
    ambient: makeBus('ambient', 0.4),
    ui: makeBus('ui', 0.9),
  };
}

/** Get or lazily create the Howl for `id` on a bus. */
function getHowl(bus: AudioBus, id: string): Howl {
  let howl = bus.cache.get(id);
  if (!howl) {
    const url = assets.url(id);
    howl = new Howl({ src: [url], volume: bus.volume });
    bus.cache.set(id, howl);
  }
  return howl;
}

/** Play a one-shot sound on `bus` identified by asset `id`. */
export function playSound(buses: AudioBuses, busName: keyof AudioBuses, id: string): void {
  const bus = buses[busName];
  getHowl(bus, id).play();
}

/** Currently-playing music Howl (module-level for stop-on-switch). */
let currentMusicHowl: Howl | null = null;

/**
 * Play a looping music track. Stops the current track first.
 * Uses the `music` bus.
 */
export function playMusic(buses: AudioBuses, id: string): void {
  if (currentMusicHowl) {
    currentMusicHowl.stop();
  }
  const howl = getHowl(buses.music, id);
  howl.loop(true);
  howl.play();
  currentMusicHowl = howl;
}

/** Mute or unmute all Howler audio globally. */
export function setMuted(muted: boolean): void {
  Howler.mute(muted);
}
