/**
 * M_FUN.REFACTOR.AI-SPLIT — MilitaryEvaluator + MoveMilitaryGoal.
 *
 * Verb 3: decide when to send military and issue move + target commands.
 * Split from ai-player.ts. See spec 100/101/102 + M_AI_DEPTH.3.
 */
import { Goal, GoalEvaluator } from 'yuka';
import type { AiPlayer } from '@/ai/ai-player';
import { aiProfileFor, endgameUrgencyFor } from '@/ai/ai-profiles';
import { discoveredEnemyTile, firstMilitary, firstPulsingTile } from '@/ai/helpers';
import { EnemyTarget, FactionTrait, Stance, Unit } from '@/ecs/components';
import { moveUnit } from '@/game/commands';
import { matchElapsedSeconds } from '@/game/match-time';
import { SKINS } from '@/rules/skins';
import { MILITARY_ROLES } from '@/rules/unit-profiles';

export { MoveMilitaryGoal };

// QW-6 — alias the derived set so a new military unit flows through automatically.
const MILITARY_TYPES = MILITARY_ROLES;

/**
 * Score the desire to send a military unit. Defending a pulsing tile we
 * own is prioritised over attacking (M_AI_DEPTH.3).
 */
export class MilitaryEvaluator extends GoalEvaluator<AiPlayer> {
  constructor(
    private readonly personalityMul: number = 1.0,
    private readonly rageQuitThreshold: number = 180,
  ) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (!firstMilitary(owner.game, owner.faction)) return 0;
    const bias = SKINS[owner.faction].brain?.aggressiveness ?? 1.0;
    const profile = aiProfileFor(owner.game.mode);
    const urgency = endgameUrgencyFor(
      owner.game.mode,
      owner.game.turn?.turnsElapsed,
      owner.game.turn?.maxTurns,
    );
    const modeMul = profile.militaryWeight * urgency * this.personalityMul;
    if (firstPulsingTile(owner.game, owner.faction)) return 0.85 * bias * modeMul;
    const ragequit = matchElapsedSeconds(owner.game) >= this.rageQuitThreshold;
    const hasTarget = discoveredEnemyTile(owner.game, owner.faction, this.rageQuitThreshold);
    if (!hasTarget) return 0;
    return ragequit ? 1.5 * bias * modeMul : 0.6 * bias * modeMul;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new MoveMilitaryGoal(owner, this.rageQuitThreshold));
  }
}

/** Send every ready military unit toward the target. */
class MoveMilitaryGoal extends Goal<AiPlayer> {
  constructor(
    owner: AiPlayer,
    private readonly rageQuitThreshold: number = 180,
  ) {
    super(owner);
  }

  activate(): void {
    const owner = this.owner as AiPlayer;
    const defendKey = firstPulsingTile(owner.game, owner.faction);
    const target =
      defendKey ?? discoveredEnemyTile(owner.game, owner.faction, this.rageQuitThreshold);
    if (!target) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const opposingBase =
      owner.faction === 'player' ? owner.game.enemyBaseEntity : owner.game.palaceEntity;
    const opposingBaseId = Number(opposingBase);
    let any = false;
    for (const e of owner.game.world.query(Unit, FactionTrait)) {
      if (e.get(FactionTrait)?.faction !== owner.faction) continue;
      const utype = e.get(Unit)?.unitType;
      if (!utype || !MILITARY_TYPES.has(utype)) continue;
      if (e.has(Stance)) e.set(Stance, { mode: 'aggressive' });
      const path = moveUnit(owner.game, e, target, owner.faction);
      if (e.has(EnemyTarget)) e.set(EnemyTarget, { targetId: opposingBaseId });
      if (path) any = true;
    }
    this.status = any ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (any) owner.lastGoal = defendKey ? 'defend' : 'move-military';
  }
}
