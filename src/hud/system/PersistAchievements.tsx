import { useEffect, useRef } from 'react';
import { unlockAchievement } from '@/game/achievements';
import type { GameState } from '@/game/game-state';
import type { Persistence } from '@/persistence/persistence';
import { useRafLoop } from '../useRafLoop';

/**
 * M_EXPANSION.F.77 — persistent-achievement watcher.
 *
 * Polls the game outcome each frame; on the false→true edge for
 * 'win', unlocks the first-victory achievement (if not already
 * unlocked) and the wonder-win achievement (if the win was
 * triggered by the Wonder countdown).
 *
 * Pure persistence — no audio (AchievementWatcher already fires
 * the chime). Stateless on remount: the persistence read covers
 * the dedupe.
 */
export function PersistAchievements({
  game,
  persistence,
}: {
  game: GameState;
  persistence: Persistence;
}) {
  const lastOutcome = useRef<string>('playing');

  useEffect(() => {
    lastOutcome.current = game.outcome;
  }, [game]);

  useRafLoop(() => {
    const o = game.outcome;
    if (o === lastOutcome.current) return;
    lastOutcome.current = o;
    if (o !== 'win') return;
    // Always-on first-victory.
    void unlockAchievement(persistence, 'first-victory');
    // Wonder-win path: the player's wonderTimer reached 0 (=== 0,
    // not Infinity) at the moment outcome flipped.
    if (game.wonderTimers.player === 0) {
      void unlockAchievement(persistence, 'wonder-win');
    }
  }, [game]);

  return null;
}
