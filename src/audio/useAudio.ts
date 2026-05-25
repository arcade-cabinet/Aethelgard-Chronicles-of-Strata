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
import { axialToWorld } from '@/core/hex';
import { Building, FactionBase, Health, HexPosition } from '@/ecs/components';
import type { DamageEvent } from '@/ecs/systems/combat';
import type { GameState } from '@/game/game-state';
import { pushCaptionForEvent } from '@/hud/captions';
import { cameraView } from '@/render/camera-view';
import {
  createAudioBuses,
  duckMusic,
  playMusic,
  playSound,
  playSoundAt,
  restoreMusic,
  startAmbient,
  stopAmbient,
} from './buses';
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
  // M_EXPANSION.AU.42 — pre-victory crescendo. Music ducks to 40%
  // when imminent victory is detected (enemy TownHall HP <10% OR
  // wonderTimer <3s on EITHER faction). When the trigger releases
  // (e.g. the enemy heals or the wonder is cancelled — both unlikely
  // but cheap to support), music restores. The outcome-transition
  // block above ALSO restores so we never leave music ducked.
  const crescendoActiveRef = useRef<boolean>(false);

  useEffect(() => {
    // Start the gameplay music loop when the hook mounts.
    playMusic(busesRef.current, 'audio.music.gameplay');
    // Register buses with the UI sound emitter so HUD components outside the
    // Canvas can fire sounds via emitUiSound().
    const unregister = registerUiSoundPlayer(busesRef.current);
    return unregister;
  }, []);

  useEffect(() => {
    // M_V8.PORTAL-STONE.AUDIO — play a stinger when the rare portal-stones
    // event fires. The event is dispatched from tickClockPhase when the
    // random-event trigger succeeds (1-in-200 after 5min, at-most-once).
    const onPortalStones = (): void => {
      const map = SOUND_FOR_EVENT['portal-stones-placed'];
      playSound(busesRef.current, map.bus, resolveSoundId(map));
      // CodeRabbit PR #44: fire the caption alongside the audio so the
      // a11y captions overlay surfaces the event for deaf/mute players.
      pushCaptionForEvent('portal-stones-placed');
    };
    if (typeof window === 'undefined') return;
    window.addEventListener('aethelgard:portal-stones-placed', onPortalStones);
    return () => window.removeEventListener('aethelgard:portal-stones-placed', onPortalStones);
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
      // M_EXPANSION.AU.48 — 3D-positional combat audio. Pull the
      // target's world position from its HexPosition trait + the
      // current camera view (cameraView is mutated by CameraRig).
      // Falls back to plain playSound if the target has no position
      // (shouldn't happen but defensive).
      const camPos = { x: cameraView.targetX, z: cameraView.targetZ };
      const camAz = cameraView.azimuth;
      const positionalPlay = (bus: 'sfx', soundId: string, ev: (typeof events)[number]): void => {
        const hex = ev.target.get(HexPosition);
        if (!hex) {
          playSound(buses, bus, soundId);
          return;
        }
        const w = axialToWorld(hex.q, hex.r);
        playSoundAt(buses, bus, soundId, w, camPos, camAz);
      };
      for (const ev of events) {
        if (ev.parried) {
          positionalPlay('sfx', resolveSoundId(parryMap), ev);
          pushCaptionForEvent('combat-parry');
          continue;
        }
        if (ev.isCrit) {
          positionalPlay('sfx', resolveSoundId(critMap), ev);
          pushCaptionForEvent('combat-crit');
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
        positionalPlay('sfx', resolveSoundId(map), ev);
        // M_EXPANSION.U.114 — caption the hit. Same per-damage-type
        // routing so the band reads "Sword clash" vs "Siege impact"
        // vs "Spell strikes" accurately.
        const captionEvent =
          ev.damageType === 'siege'
            ? 'combat-hit-siege'
            : ev.damageType === 'magic'
              ? 'combat-hit-magic'
              : ev.isMeleeSword
                ? 'combat-hit-melee'
                : 'combat-hit';
        pushCaptionForEvent(captionEvent);
      }
    }

    // Detect outcome transitions and play stingers.
    const currentOutcome = game.outcome;
    if (currentOutcome !== lastOutcomeRef.current) {
      lastOutcomeRef.current = currentOutcome;
      if (currentOutcome === 'win') {
        const map = SOUND_FOR_EVENT.victory;
        playSound(buses, map.bus, resolveSoundId(map));
        pushCaptionForEvent('victory');
        // M_EXPANSION.AU.38 — after the stinger, swap looping music to
        // a peaceful village track for the victory state. playMusic
        // stops the current track first.
        playMusic(buses, 'audio.music.biome.town-of-eldor');
        // M_EXPANSION.AU.42 — restore the duck on win-flip; the
        // victory music is the new track, no need to keep ducked.
        if (crescendoActiveRef.current) {
          restoreMusic();
          crescendoActiveRef.current = false;
        }
      } else if (currentOutcome === 'loss') {
        const map = SOUND_FOR_EVENT.defeat;
        playSound(buses, map.bus, resolveSoundId(map));
        pushCaptionForEvent('defeat');
        if (crescendoActiveRef.current) {
          restoreMusic();
          crescendoActiveRef.current = false;
        }
      } else if (currentOutcome === 'draw') {
        // M_PROCESS.REVIEW must-fix #1 — draw outcome was missing
        // from the crescendo-restore branch. Without this the music
        // stayed ducked at 40% forever after a turn-cap tie. Use
        // the defeat stinger as the placeholder draw cue (a future
        // polish pass can swap in a dedicated draw stinger).
        const map = SOUND_FOR_EVENT.defeat;
        playSound(buses, map.bus, resolveSoundId(map));
        pushCaptionForEvent('defeat');
        if (crescendoActiveRef.current) {
          restoreMusic();
          crescendoActiveRef.current = false;
        }
      }
    }

    // M_EXPANSION.AU.42 — pre-victory crescendo detection. Only
    // arm while still playing. Triggers (any one):
    //   - Enemy TownHall (FactionBase + faction='enemy') HP <10% of max
    //   - Player wonderTimer between 0.01 and 3.0 seconds
    //   - Enemy wonderTimer between 0.01 and 3.0 seconds (loss-edge —
    //     a defeat crescendo deserves the same musical breath)
    if (currentOutcome === 'playing') {
      let imminent = false;
      // Wonder edge — all registered factions (M_V8.WONDER-TIMERS.N-PLAYER).
      // Any faction within 3s of wonder-win triggers the crescendo.
      for (const wt of Object.values(game.wonderTimers ?? {})) {
        if (typeof wt === 'number' && wt > 0 && wt < 3) {
          imminent = true;
          break;
        }
      }
      // Enemy TownHall HP edge.
      if (!imminent) {
        for (const e of game.world.query(FactionBase, Health)) {
          const f = e.get(FactionBase);
          if (f?.faction !== 'enemy') continue;
          const h = e.get(Health);
          if (!h) continue;
          if (h.current > 0 && h.current / h.max < 0.1) imminent = true;
          break;
        }
      }
      if (imminent && !crescendoActiveRef.current) {
        duckMusic(0.4);
        crescendoActiveRef.current = true;
      } else if (!imminent && crescendoActiveRef.current) {
        restoreMusic();
        crescendoActiveRef.current = false;
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
        pushCaptionForEvent('building-completed');
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
