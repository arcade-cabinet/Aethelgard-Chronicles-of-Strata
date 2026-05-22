/**
 * Event → sound map.
 *
 * Enumerates every game audio event and maps each to the bus + asset id that
 * should play when the event fires.
 *
 * Source: docs/specs/80-audio.md §Event → Sound Map
 */
import type { AudioBuses } from './buses';

/** All named game audio events. */
export type GameAudioEvent =
  | 'combat-hit'
  | 'harvest-chop'
  | 'resource-deposit'
  | 'unit-select'
  | 'building-placed'
  | 'victory'
  | 'defeat';

/** A resolved bus + asset id pair for a sound event. */
export interface SoundMapping {
  bus: keyof AudioBuses;
  soundId: string;
}

/** Maps every `GameAudioEvent` to the bus and asset id that plays it. */
export const SOUND_FOR_EVENT: Record<GameAudioEvent, SoundMapping> = {
  'combat-hit': { bus: 'sfx', soundId: 'audio.sfx.hit' },
  'harvest-chop': { bus: 'sfx', soundId: 'audio.sfx.chop' },
  'resource-deposit': { bus: 'sfx', soundId: 'audio.sfx.deposit' },
  'unit-select': { bus: 'ui', soundId: 'audio.sfx.select' },
  'building-placed': { bus: 'sfx', soundId: 'audio.sfx.build' },
  victory: { bus: 'music', soundId: 'audio.stinger.victory' },
  defeat: { bus: 'sfx', soundId: 'audio.stinger.defeat' },
};
