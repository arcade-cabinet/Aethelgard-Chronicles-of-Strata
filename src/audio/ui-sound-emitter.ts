/**
 * Module-level UI sound emitter.
 *
 * Bridges the HUD (outside the r3f Canvas) to the audio buses owned by
 * `useAudio` (inside the Canvas). `useAudio` registers its `playSound`
 * implementation via `registerUiSoundPlayer`; HUD components call `emitUiSound`
 * without knowing about howler or the bus structure.
 *
 * Only one player can be registered at a time (the hook's lifecycle ensures
 * this). Before registration — or after unmount — calls are no-ops.
 */
import type { AudioBuses } from './buses';
import { playSound } from './buses';
import type { GameAudioEvent } from './sound-map';
import { resolveSoundId, SOUND_FOR_EVENT } from './sound-map';

/** A registered sound player from the useAudio hook. */
interface RegisteredPlayer {
  buses: AudioBuses;
}

let _player: RegisteredPlayer | null = null;

/** Called by `useAudio` when it mounts. Returns a cleanup function. */
export function registerUiSoundPlayer(buses: AudioBuses): () => void {
  _player = { buses };
  return () => {
    _player = null;
  };
}

/**
 * Fire a game audio event from any HUD component.
 * No-op if the audio system has not mounted yet.
 */
export function emitUiSound(event: GameAudioEvent): void {
  if (!_player) return;
  const mapping = SOUND_FOR_EVENT[event];
  const soundId = resolveSoundId(mapping);
  if (!soundId) return;
  playSound(_player.buses, mapping.bus, soundId);
}
