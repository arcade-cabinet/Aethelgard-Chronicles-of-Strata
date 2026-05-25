/**
 * M_FUN.REFACTOR.AI-SPLIT — PatrolEvaluator + PatrolGoal.
 *
 * Verb 5: idle military units patrol the zone perimeter.
 * Split from ai-player.ts. See M_EXPANSION.S.55.
 */
import { Goal, GoalEvaluator } from 'yuka';
import { moveUnit } from '@/game/commands';
import { aiProfileFor } from '@/ai/ai-profiles';
import {
  discoveredEnemyTile,
  firstMilitary,
  firstPulsingTile,
  randomPerimeterTile,
} from '@/ai/helpers';
import type { AiPlayer } from '@/ai/ai-player';

export { PatrolGoal };

/** Default rage-quit threshold (seconds) — overridden by personality config. */
const DEFAULT_RAGE_QUIT = 180;

/**
 * Idle military units patrol the zone perimeter when nothing else
 * needs doing. Fires when:
 *   - AI has at least one military unit
 *   - No enemy is visible (MilitaryEvaluator would win anyway)
 *   - No defensive trigger (no pulsing tile)
 *   - AI mode allows military (coexistence sets profile.militaryWeight=0)
 */
export class PatrolEvaluator extends GoalEvaluator<AiPlayer> {
  constructor(
    private readonly personalityMul: number = 1.0,
    private readonly rageQuitThreshold: number = DEFAULT_RAGE_QUIT,
  ) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (owner.game.outcome !== 'playing') return 0;
    if (!firstMilitary(owner.game, owner.faction)) return 0;
    if (firstPulsingTile(owner.game, owner.faction)) return 0;
    if (discoveredEnemyTile(owner.game, owner.faction, this.rageQuitThreshold)) return 0;
    const profile = aiProfileFor(owner.game.mode);
    return 0.25 * profile.militaryWeight * this.personalityMul;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new PatrolGoal(owner));
  }
}

/** Move one idle military unit to a random perimeter tile of the AI's zone. */
class PatrolGoal extends Goal<AiPlayer> {
  activate(): void {
    const owner = this.owner as AiPlayer;
    const unit = firstMilitary(owner.game, owner.faction);
    const perimeter = randomPerimeterTile(owner.game, owner.faction);
    if (!unit || !perimeter) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const path = moveUnit(owner.game, unit, perimeter, owner.faction);
    this.status = path ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (path) owner.lastGoal = 'patrol';
  }
}
