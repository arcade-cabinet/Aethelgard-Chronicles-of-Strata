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

/**
 * Per-bus Howl cache cap (M_SEC.23). The game's sound-map has ~25
 * distinct events today; 64 leaves significant headroom for any
 * future expansion BUT prevents an unbounded grow scenario (e.g. a
 * skin-keyed audio slot in M_REGISTRY.20 where each tribe adds a
 * fresh set of Howls).
 */
const BUS_CACHE_CAP = 64;

// M_AUDIT2.SEC2.31 — gate Howler init on the first user interaction.
// Without this, calling playSound() before the user has tapped/clicked
// constructs an AudioContext that browsers immediately suspend (which
// works) AND that contributes to audio fingerprint (the SR sample
// rate + capabilities are observable). On a hard-refresh of the title
// screen, useTitleMusic.ts attempts to play before any input —
// recordUserInteraction below is wired in main.tsx visibility / event
// listeners and flips the gate. playSound() / playMusic() consult the
// gate and silently drop the call if it's not yet flipped.
let interactionGate = false;
const pendingInteractionListeners: Array<() => void> = [];
export function recordUserInteraction(): void {
  if (interactionGate) return;
  interactionGate = true;
  for (const cb of pendingInteractionListeners.splice(0)) cb();
}
export function isAudioUnlocked(): boolean {
  return interactionGate;
}
export function onAudioUnlock(cb: () => void): void {
  if (interactionGate) cb();
  else pendingInteractionListeners.push(cb);
}

/** Get or lazily create the Howl for `id` on a bus (LRU-capped). */
function getHowl(bus: AudioBus, id: string): Howl {
  // Map iteration order is insertion order — deletes from the front
  // when over cap give LRU eviction. Refresh existing entries by
  // delete+reinsert so the most-recently-played stays at the back.
  let howl = bus.cache.get(id);
  if (howl) {
    bus.cache.delete(id);
    bus.cache.set(id, howl);
    return howl;
  }
  const url = assets.url(id);
  howl = new Howl({ src: [url], volume: bus.volume });
  if (bus.cache.size >= BUS_CACHE_CAP) {
    // evict the oldest entry; unload its WebAudio buffers so the
    // browser actually reclaims the memory.
    const firstKey = bus.cache.keys().next().value;
    if (firstKey !== undefined) {
      const old = bus.cache.get(firstKey);
      old?.unload();
      bus.cache.delete(firstKey);
    }
  }
  bus.cache.set(id, howl);
  return howl;
}

/** Play a one-shot sound on `bus` identified by asset `id`. */
export function playSound(buses: AudioBuses, busName: keyof AudioBuses, id: string): void {
  // M_AUDIT2.SEC2.31 — drop the call silently before the user has
  // interacted (Chrome/Safari would block AudioContext startup anyway;
  // skipping the Howl construction also avoids the fingerprint surface).
  if (!interactionGate) return;
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
  // M_AUDIT2.SEC2.31 — defer until first user interaction. The most
  // common caller is useTitleMusic which fires on mount of the title
  // screen — before any tap. Queue the call via onAudioUnlock so the
  // first menu-button press plays the track without losing it.
  if (!interactionGate) {
    onAudioUnlock(() => playMusic(buses, id));
    return;
  }
  if (currentMusicHowl) {
    currentMusicHowl.stop();
  }
  const howl = getHowl(buses.music, id);
  howl.loop(true);
  howl.play();
  currentMusicHowl = howl;
}

/** Stop whatever music is currently playing (no-op when nothing is). */
export function stopMusic(): void {
  if (currentMusicHowl) {
    currentMusicHowl.stop();
    currentMusicHowl = null;
  }
}

/**
 * M_EXPANSION.AU.41 — duck the music volume for the duration of an
 * urgent event (today: the critical-alarm pulse). Lerps the live
 * Howl's volume toward `ducked` (default 0.4) over 250ms; the caller
 * must invoke restoreMusic() to fade it back.
 */
let musicBaselineVolume = 0.5;
let duckActive = false;
export function duckMusic(ducked = 0.4): void {
  if (!currentMusicHowl) return;
  if (duckActive) return;
  duckActive = true;
  musicBaselineVolume = currentMusicHowl.volume();
  currentMusicHowl.fade(musicBaselineVolume, ducked, 250);
}
export function restoreMusic(): void {
  if (!currentMusicHowl) {
    duckActive = false;
    return;
  }
  if (!duckActive) return;
  duckActive = false;
  currentMusicHowl.fade(currentMusicHowl.volume(), musicBaselineVolume, 600);
}

/**
 * M_EXPANSION.AU.39 — single looping ambient track on the ambient
 * bus. start() is idempotent — calling it while the track is already
 * playing is a no-op. stop() fades out over 400ms.
 */
let currentAmbientHowl: Howl | null = null;
let currentAmbientId: string | null = null;
export function startAmbient(buses: AudioBuses, id: string): void {
  if (!interactionGate) {
    onAudioUnlock(() => startAmbient(buses, id));
    return;
  }
  if (currentAmbientId === id && currentAmbientHowl?.playing()) return;
  if (currentAmbientHowl) currentAmbientHowl.stop();
  const howl = getHowl(buses.ambient, id);
  howl.loop(true);
  howl.volume(0);
  howl.play();
  howl.fade(0, buses.ambient.volume, 600);
  currentAmbientHowl = howl;
  currentAmbientId = id;
}
export function stopAmbient(): void {
  if (!currentAmbientHowl) return;
  const h = currentAmbientHowl;
  h.fade(h.volume(), 0, 400);
  setTimeout(() => h.stop(), 420);
  currentAmbientHowl = null;
  currentAmbientId = null;
}

/** Mute or unmute all Howler audio globally. */
export function setMuted(muted: boolean): void {
  Howler.mute(muted);
}

/**
 * M_AUDIT2.ARCH.69 — Howler's shared AudioContext can suspend when
 * the tab/app is hidden (browser / Capacitor WebView default). On
 * resume, the FIRST sound after unhide can render silent because the
 * context is still in 'suspended' state. Calling resume() proactively
 * on visibilitychange fixes the silent-first-sound bug.
 *
 * No-op when Howler is muted (the user opted out anyway) or when the
 * context isn't suspended.
 */
export function resumeAudioContextIfSuspended(): void {
  const ctx = Howler.ctx;
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    // resume() returns a promise; we don't await it (fire-and-forget
    // is the right shape for visibilitychange handlers — the next
    // play() will queue correctly once resume settles).
    void ctx.resume();
  }
}
