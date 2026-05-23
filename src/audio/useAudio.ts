/**
 * useAudio — an r3f-friendly hook that fires sounds in response to game events.
 *
 * On mount: starts the gameplay music loop.
 * Each frame:
 *   - `game.lastDamageEvents` → combat-hit (per event) and combat-crit (for crits)
 *   - `game.outcome` transitions → victory / defeat stingers
 *   - completed-building count → building-completed on each new completion
 *
 * Source: docs/specs/80-audio.md §Audio Hook
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Building } from '@/ecs/components';
import type { DamageEvent } from '@/ecs/systems/combat';
import type { GameState } from '@/game/game-state';
import { createAudioBuses, playMusic, playSound, startAmbient, stopAmbient } from './buses';
import { resolveSoundId, SOUND_FOR_EVENT } from './sound-map';
import { registerUiSoundPlayer } from './ui-sound-emitter';

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
  // Track completed building count to detect new completions each tick.
  const lastCompleteBuildingsRef = useRef<number>(0);

  useEffect(() => {
    // Start the gameplay music loop when the hook mounts.
    playMusic(busesRef.current, 'audio.music.gameplay');
    // Register buses with the UI sound emitter so HUD components outside the
    // Canvas can fire sounds via emitUiSound().
    const unregister = registerUiSoundPlayer(busesRef.current);
    return unregister;
  }, []);

  useFrame(() => {
    const buses = busesRef.current;

    // Fire combat sounds for each damage event — but only when a NEW batch
    // arrives (detected by array-reference identity, since runEconomyTick
    // assigns a fresh array each tick).
    const events = game.lastDamageEvents;
    if (events !== lastBatchRef.current) {
      lastBatchRef.current = events;
      // M_EXPANSION.AU.45 — pick hit sound per attacker damageType.
      const critMap = SOUND_FOR_EVENT['combat-crit'];
      const hitMap = SOUND_FOR_EVENT['combat-hit'];
      const siegeMap = SOUND_FOR_EVENT['combat-hit-siege'];
      const magicMap = SOUND_FOR_EVENT['combat-hit-magic'];
      // M_POLISH.3 — sword-clash for melee normal-damage strikes;
      // shield-deflect when the defender parried. Parry takes
      // precedence — a parried sword strike doesn't ALSO play sword
      // sounds, just the deflect.
      const meleeMap = SOUND_FOR_EVENT['combat-hit-melee'];
      const parryMap = SOUND_FOR_EVENT['combat-parry'];
      for (const ev of events) {
        if (ev.parried) {
          playSound(buses, parryMap.bus, resolveSoundId(parryMap));
          continue;
        }
        if (ev.isCrit) {
          // Crit: play the magic-impact stab instead of (not in addition to) the
          // regular hit — one sound per crit event keeps it punchy.
          playSound(buses, critMap.bus, resolveSoundId(critMap));
          continue;
        }
        const map =
          ev.damageType === 'siege'
            ? siegeMap
            : ev.damageType === 'magic'
              ? magicMap
              : ev.isMeleeSword
                ? meleeMap
                : hitMap;
        playSound(buses, map.bus, resolveSoundId(map));
      }
    }

    // Detect outcome transitions and play stingers.
    const currentOutcome = game.outcome;
    if (currentOutcome !== lastOutcomeRef.current) {
      lastOutcomeRef.current = currentOutcome;
      if (currentOutcome === 'win') {
        const map = SOUND_FOR_EVENT.victory;
        playSound(buses, map.bus, resolveSoundId(map));
        // M_EXPANSION.AU.38 — after the stinger, swap looping music to
        // a peaceful village track for the victory state. playMusic
        // stops the current track first.
        playMusic(buses, 'audio.music.biome.town-of-eldor');
      } else if (currentOutcome === 'loss') {
        const map = SOUND_FOR_EVENT.defeat;
        playSound(buses, map.bus, resolveSoundId(map));
      }
    }

    // Detect newly-completed buildings by counting entities with isComplete.
    // One building-completed sound per new completion. Also tracks
    // in-progress count for the M_EXPANSION.AU.39 ambient layer below.
    let completeCount = 0;
    let inProgressCount = 0;
    for (const e of game.world.query(Building)) {
      const b = e.get(Building);
      if (!b) continue;
      if (b.isComplete) completeCount++;
      else inProgressCount++;
    }
    const prev = lastCompleteBuildingsRef.current;
    if (completeCount > prev) {
      const map = SOUND_FOR_EVENT['building-completed'];
      const newCompletions = completeCount - prev;
      for (let i = 0; i < newCompletions; i++) {
        playSound(buses, map.bus, resolveSoundId(map));
      }
    }
    lastCompleteBuildingsRef.current = completeCount;
    // M_EXPANSION.AU.39 — crafting-hall ambient while ≥1 build site
    // is mid-construction. start/stop are idempotent so calling them
    // every frame is safe.
    if (inProgressCount > 0) startAmbient(buses, 'audio.music.biome.crafting-hall');
    else stopAmbient();
  });
}
