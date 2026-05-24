import { useEffect, useRef } from 'react';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import type { GameState } from '@/game/game-state';
import { announce } from './aria-live-bus';
import { useRafLoop } from './useRafLoop';

/**
 * M_EXPANSION.AU.33 — achievement watcher.
 *
 * Polls game state each frame for milestone-events worth celebrating
 * (today: first time the player's controlled zone grows beyond the
 * seeded ATTRACTOR_RADIUS=2 footprint). On the false→true edge, emits
 * the achievement SFX + an aria-live announcement so SR users hear it.
 *
 * Pure HUD — no game-state mutation. Future milestones (first kill,
 * first wonder, first 10 peons) reuse the same edge-detect pattern;
 * each is one boolean lookup per frame.
 */
export function AchievementWatcher({ game }: { game: GameState }) {
  const seedSize = useRef<number>(-1);
  const firedFirstClaim = useRef(false);

  useEffect(() => {
    // Capture the seed footprint size ONCE on first mount so a save-resume
    // doesn't re-celebrate a zone that was already grown last session.
    seedSize.current = game.zones.player.controlled.size;
    // If the loaded game already has a larger zone than the seed, the
    // achievement was already earned — suppress.
    firedFirstClaim.current = seedSize.current > 6;
  }, [game]);

  useRafLoop(() => {
    if (firedFirstClaim.current) return;
    const now = game.zones.player.controlled.size;
    if (now > seedSize.current) {
      firedFirstClaim.current = true;
      emitUiSound('achievement');
      announce('Your zone of control has grown.', 'polite');
    }
  }, [game]);

  return null;
}
