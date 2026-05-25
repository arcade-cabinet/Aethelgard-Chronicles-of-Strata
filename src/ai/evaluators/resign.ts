/**
 * M_FUN.REFACTOR.AI-SPLIT — ResignEvaluator + ResignGoal.
 *
 * Verb 4 (implicit): the AI surrenders when starved for too long.
 * Split from ai-player.ts. See M_MODES.10.
 */
import { Goal, GoalEvaluator } from 'yuka';
import { resign } from '@/game/commands';
import type { AiPlayer } from '@/ai/ai-player';

export { ResignGoal };

/** Seconds of continuous starvation before the AI resigns (long-reign mode only). */
const STARVATION_THRESHOLD = 300;

/**
 * The AI surrenders when its faction is "starved" for STARVATION_THRESHOLD
 * seconds (0 controlled tiles AND economy below sustenance).
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
    return owner.starvedFor >= STARVATION_THRESHOLD ? 1 : 0;
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
