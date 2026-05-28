/**
 * M_FUN.REFACTOR.AI-SPLIT — TrainEvaluator + TrainGoal.
 *
 * Verb 2: decide what unit to train and issue the trainUnit command.
 * Split from ai-player.ts. See spec 100/101/102 + M_AI_DEPTH.2.
 */
import { Goal, GoalEvaluator } from 'yuka';
import type { AiPlayer } from '@/ai/ai-player';
import { ownedBuildingCount, ownedMilitaryCount, ownedPeonCount } from '@/ai/helpers';
import { trainUnit } from '@/game/commands';
import { canAfford } from '@/game/economy';
import { peonCap, UNIT_COSTS } from '@/rules';
import { canTrain } from '@/rules/economy-rules';

export { TrainGoal };

/**
 * Decide what (if anything) to train this tick. Priority:
 *   1. Peon if peon-cap allows + at least one is missing.
 *   2. Footman if a Barracks exists and the AI can afford one.
 */
export class TrainEvaluator extends GoalEvaluator<AiPlayer> {
  /**
   * M_FUN.AI.NAMED — personality bias on training. Default 1.0 = neutral.
   * Builder underweights, Raider/Mad-King overweight.
   */
  constructor(private readonly personalityMul: number = 1.0) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    const choice = this.pickTrainable(owner);
    if (!choice) return 0;
    if (owner.game && choice === 'Footman') {
      const ownMilitary = ownedMilitaryCount(owner.game, owner.faction);
      if (ownMilitary === 0) return 1.1;
    }
    return 0.75 * this.personalityMul;
  }

  setGoal(owner: AiPlayer): void {
    const choice = this.pickTrainable(owner);
    if (!choice) return;
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new TrainGoal(owner, choice));
  }

  pickTrainable(owner: AiPlayer): 'Peon' | 'Footman' | 'Diplomat' | null {
    const { game, faction } = owner;
    if (!game) return null;
    const eco = game.economy[faction];
    const peons = ownedPeonCount(game, faction);
    const houses = ownedBuildingCount(game, faction, 'House');
    const granaries = ownedBuildingCount(game, faction, 'Granary');
    if (
      peons < peonCap(houses, granaries) &&
      canAfford(eco, UNIT_COSTS.Peon) &&
      canTrain(eco, 'Peon')
    )
      return 'Peon';
    if (
      ownedBuildingCount(game, faction, 'Barracks') > 0 &&
      canAfford(eco, UNIT_COSTS.Footman) &&
      canTrain(eco, 'Footman')
    )
      return 'Footman';
    // M_V12.AI-DIPLO.DIPLOMAT-UNIT — train a Diplomat from Embassy
    // when one exists and the AI doesn't already have a Diplomat in
    // play. The Diplomat walks into foreign zones via
    // diplomat-contact.ts to establish first-contact for the
    // diplomacy substrate. Gated on UNIT_COSTS.Diplomat existing
    // (skipped if v0.11 unit registry doesn't define one yet).
    if (
      UNIT_COSTS.Diplomat &&
      ownedBuildingCount(game, faction, 'Embassy') > 0 &&
      canAfford(eco, UNIT_COSTS.Diplomat) &&
      canTrain(eco, 'Diplomat')
    ) {
      return 'Diplomat';
    }
    return null;
  }
}

/** Issue the chosen train via the shared `commands.trainUnit`. */
class TrainGoal extends Goal<AiPlayer> {
  constructor(
    owner: AiPlayer,
    private readonly role: 'Peon' | 'Footman' | 'Diplomat',
  ) {
    super(owner);
  }

  activate(): void {
    const owner = this.owner as AiPlayer;
    const ok = trainUnit(owner.game, this.role, owner.faction);
    this.status = ok ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (ok) owner.lastGoal = `train:${this.role}`;
  }
}
