/**
 * M_FUN.REFACTOR.AI-SPLIT — ResignEvaluator + ResignGoal.
 *
 * Verb 4 (implicit): the AI surrenders when starved for too long.
 * Split from ai-player.ts. See M_MODES.10.
 *
 * M_PIVOT.AI.JSON-PERSONALITIES — starvation threshold is now per-
 * personality (the-hoarder: 480s patient, the-mad-king: 180s impatient).
 * Read from ai-personalities.json via personalityFor() with a 300s
 * fallback for personality rows that omit it.
 */
import { Goal, GoalEvaluator } from 'yuka';
import type { AiPlayer } from '@/ai/ai-player';
import { personalityFor } from '@/config/ai-personalities';
import { resign } from '@/game/commands';

export { ResignGoal };

/**
 * Default starvation tolerance (sim-seconds) when the AI's personality
 * row omits `starvationThreshold`. Preserves v0.4 behaviour for any
 * personality file that hasn't been updated.
 */
const DEFAULT_STARVATION_THRESHOLD = 300;

/**
 * The AI surrenders when its faction is "starved" for the per-personality
 * starvation threshold (0 controlled tiles AND economy below sustenance).
 * Only fires in long-reign mode — other modes use base-destruction as outcome.
 */
export class ResignEvaluator extends GoalEvaluator<AiPlayer> {
  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (owner.game.outcome !== 'playing') return 0;
    if (owner.game.mode !== 'long-reign') return 0;
    const zone = owner.game.zones[owner.faction];
    const eco = owner.game.economy[owner.faction];
    const starved = zone.controlled.size === 0 && eco.wood < 10 && eco.gold < 10 && eco.stone < 10;
    if (!starved) {
      owner.starvedFor = 0;
      return 0;
    }
    const threshold =
      personalityFor(owner.personalityKey).starvationThreshold ?? DEFAULT_STARVATION_THRESHOLD;
    return owner.starvedFor >= threshold ? 1 : 0;
  }

  setGoal(owner: AiPlayer): void {
    // Re-gate inside setGoal so we never enqueue ResignGoal in modes that
    // don't support starvation-resign (yuka's arbitrate() can pick any
    // evaluator even when its desirability was 0).
    if (!owner.game || owner.game.mode !== 'long-reign') return;
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new ResignGoal(owner));
  }
}

/** Issue the resign command on behalf of the AI's faction. */
class ResignGoal extends Goal<AiPlayer> {
  activate(): void {
    const owner = this.owner as AiPlayer;
    resign(owner.game, owner.faction);
    owner.lastGoal = 'resign';
    this.status = Goal.STATUS.COMPLETED;
  }
}
