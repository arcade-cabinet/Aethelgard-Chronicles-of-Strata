/**
 * M_V9.AI.WONDER-EVALUATOR — WonderEvaluator + WonderGoal.
 *
 * Desirability spikes when:
 *   1. The faction can afford the Wonder (wood 500 / stone 400 / gold 300).
 *   2. No Wonder already built (one-per-faction limit).
 *   3. A free build tile exists.
 *   4. Supply headroom: score scales with remaining supply capacity.
 *
 * Each personality configures `wonderWeight` (0–1) in ai-personalities.json.
 * Default is 0.5 (the-diplomat baseline).
 */
import { Goal, GoalEvaluator } from 'yuka';
import type { AiPlayer } from '@/ai/ai-player';
import { freeBuildTile, ownedBuildingCount } from '@/ai/helpers';
import { placeBuilding } from '@/game/commands';
import { canAfford } from '@/game/economy';
import { economyFor } from '@/game/economy-for';
import { BUILDING_COSTS } from '@/rules';

export { WonderGoal };

class WonderGoal extends Goal<AiPlayer> {
  // biome-ignore lint/suspicious/noEmptyBlockStatements: yuka Goal lifecycle stubs
  override activate(): void {}
  override execute(): void {
    // owner is nullable in yuka types — cast defensively.
    const owner = this.owner as AiPlayer;
    if (!owner?.game) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const tileKey = freeBuildTile(owner.game, owner.faction);
    if (!tileKey) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const ok = placeBuilding(owner.game, tileKey, 'Wonder', owner.faction);
    this.status = ok ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
  }
  // biome-ignore lint/suspicious/noEmptyBlockStatements: yuka Goal lifecycle stubs
  override terminate(): void {}
}

export class WonderEvaluator extends GoalEvaluator<AiPlayer> {
  constructor(private readonly wonderWeight: number = 0.5) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    const { game, faction } = owner;
    if (!game) return 0;

    // Already have a Wonder — no point building another.
    if (ownedBuildingCount(game, faction, 'Wonder') > 0) return 0;

    // Need a free tile to build on.
    if (!freeBuildTile(game, faction)) return 0;

    const eco = economyFor(game, faction);

    // Must be able to afford the Wonder cost.
    if (!canAfford(eco, BUILDING_COSTS.Wonder)) return 0;

    // Desirability scales with supply headroom — prefer building Wonder
    // when supply is NOT yet maxed out (headroom means room to grow).
    const maxSupply = eco.maxSupply === 0 ? 1 : eco.maxSupply;
    const supplyRatio = Math.min(eco.usedSupply / maxSupply, 1);

    return this.wonderWeight * (1 - supplyRatio * 0.6);
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new WonderGoal(owner));
  }
}
