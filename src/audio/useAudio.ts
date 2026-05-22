/**
 * useAudio — an r3f-friendly hook that fires sounds in response to game events.
 *
 * On mount: starts the gameplay music loop.
 * Each frame: inspects `game.lastDamageEvents` (→ combat-hit) and
 * `game.outcome` transitions (→ victory / defeat), firing the mapped sounds.
 *
 * Source: docs/specs/80-audio.md §Audio Hook
 */
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { DamageEvent } from '@/ecs/systems/combat';
import type { GameState } from '@/game/game-state';
import { createAudioBuses, playMusic, playSound } from './buses';
import { SOUND_FOR_EVENT } from './sound-map';

/**
 * Call inside an r3f `<Canvas>` descendant. Drives the game's audio from the
 * live `GameState`. Safe to call multiple times — only one instance should
 * be mounted at a time.
 */
export function useAudio(game: GameState): void {
  const busesRef = useRef(createAudioBuses());
  // Track the last known outcome so we only fire stingers on transitions.
  const lastOutcomeRef = useRef<string>('playing');
  // Track the last damage-event batch by reference so a hit fires once, not
  // every frame the batch lingers on game.lastDamageEvents.
  const lastBatchRef = useRef<DamageEvent[] | null>(null);

  useEffect(() => {
    // Start the gameplay music loop when the hook mounts.
    playMusic(busesRef.current, 'audio.music.gameplay');
    // No cleanup — let the track continue (the mute toggle handles silencing).
  }, []);

  useFrame(() => {
    const buses = busesRef.current;

    // Fire a combat-hit sound for each damage event — but only when a NEW
    // batch arrives (detected by array-reference identity, since runEconomyTick
    // assigns a fresh array each tick).
    const events = game.lastDamageEvents;
    if (events !== lastBatchRef.current) {
      lastBatchRef.current = events;
      const { bus: hitBus, soundId: hitId } = SOUND_FOR_EVENT['combat-hit'];
      for (let i = 0; i < events.length; i++) {
        playSound(buses, hitBus, hitId);
      }
    }

    // Detect outcome transitions and play stingers.
    const currentOutcome = game.outcome;
    if (currentOutcome !== lastOutcomeRef.current) {
      lastOutcomeRef.current = currentOutcome;
      if (currentOutcome === 'win') {
        const { bus, soundId } = SOUND_FOR_EVENT['victory'];
        playSound(buses, bus, soundId);
      } else if (currentOutcome === 'loss') {
        const { bus, soundId } = SOUND_FOR_EVENT['defeat'];
        playSound(buses, bus, soundId);
      }
    }
  });
}
