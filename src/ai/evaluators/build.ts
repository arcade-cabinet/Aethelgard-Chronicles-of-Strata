/**
 * M_FUN.REFACTOR.AI-SPLIT — BuildEvaluator + BuildGoal.
 *
 * Verb 1: decide what building to place and issue the placeBuilding command.
 * Split from ai-player.ts (was 728 lines). See spec 100/101/102.
 */
import { Goal, GoalEvaluator } from 'yuka';
import type { AiPlayer } from '@/ai/ai-player';
import { aiProfileFor } from '@/ai/ai-profiles';
import {
  discoveredEnemyTile,
  freeBuildTile,
  ownedBuildingCount,
  ownedPeonCount,
  totalOwnedBuildings,
} from '@/ai/helpers';
import type { BuildingType } from '@/ecs/components';
import { placeBuilding } from '@/game/commands';
import { matchElapsedSeconds } from '@/game/match-time';
import { canBuild, peonCap } from '@/rules';
import { SKINS } from '@/rules/skins';

export { BuildGoal };

/** Decide what (if anything) to build next; the highest-priority unmet need wins. */
export class BuildEvaluator extends GoalEvaluator<AiPlayer> {
  /**
   * M_FUN.AI.NAMED — personality multiplier. Default 1.0 = neutral.
   * the-builder=1.5 (eager to build), the-mad-king=0.4 (rarely builds).
   */
  constructor(
    private readonly personalityMul: number = 1.0,
    private readonly rageQuitThreshold: number = 180,
  ) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    const choice = this.pickBuildable(owner);
    if (!choice) return 0;
    const bias = SKINS[owner.faction].brain?.economyFocus ?? 1.0;
    const profile = aiProfileFor(owner.game?.mode);
    const defensiveTypes: ReadonlyArray<string> = ['Wall', 'Watchtower'];
    const defensiveMul = defensiveTypes.includes(choice as string)
      ? profile.defensiveBuildWeight
      : 1.0;
    const builtCount = owner.game ? totalOwnedBuildings(owner.game, owner.faction) : 0;
    const saturationMul = builtCount <= 4 ? 1.0 : 1.0 / (1 + (builtCount - 4) ** 2 * 0.3);
    return 0.7 * bias * profile.buildWeight * defensiveMul * this.personalityMul * saturationMul;
  }

  setGoal(owner: AiPlayer): void {
    const choice = this.pickBuildable(owner);
    if (!choice) return;
    owner.brain.clearSubgoals();
    owner.brain.addSubgoal(new BuildGoal(owner, choice));
  }

  /** The first need in priority order whose rules.canBuild succeeds. */
  pickBuildable(owner: AiPlayer): Exclude<BuildingType, 'Palace'> | null {
    const { game, faction } = owner;
    if (!game) return null;
    const eco = game.economy[faction];
    const peons = ownedPeonCount(game, faction);
    const houses = ownedBuildingCount(game, faction, 'House');
    const granaries = ownedBuildingCount(game, faction, 'Granary');
    const atCap = peons >= peonCap(houses, granaries);

    const priority: Array<Exclude<BuildingType, 'Palace'>> = [];
    if (atCap) priority.push('House');
    if (!atCap && ownedBuildingCount(game, faction, 'House') < 2) priority.push('House');
    priority.push('Farm');
    const enemySighted = discoveredEnemyTile(game, faction, this.rageQuitThreshold) !== null;
    const matchElapsedSec = matchElapsedSeconds(game);
    const barracksReady = enemySighted || matchElapsedSec >= 90;
    if (ownedBuildingCount(game, faction, 'Barracks') === 0 && barracksReady)
      priority.push('Barracks');
    if (atCap) priority.push('Granary');
    if (ownedBuildingCount(game, faction, 'Watchtower') === 0 && enemySighted)
      priority.push('Watchtower');
    if (ownedBuildingCount(game, faction, 'Wall') < 2) priority.push('Wall');

    const tile = freeBuildTile(game, faction);
    if (!tile) return null;
    for (const type of priority) {
      if (canBuild(game.board, new Set(game.buildSites.keys()), tile, type, eco).ok) return type;
    }
    return null;
  }
}

/** Issue the chosen build via the shared `commands.placeBuilding`. */
class BuildGoal extends Goal<AiPlayer> {
  constructor(
    owner: AiPlayer,
    private readonly buildingType: Exclude<BuildingType, 'Palace'>,
  ) {
    super(owner);
  }

  activate(): void {
    const owner = this.owner as AiPlayer;
    const tile = freeBuildTile(owner.game, owner.faction);
    if (!tile) {
      this.status = Goal.STATUS.FAILED;
      return;
    }
    const ok = placeBuilding(owner.game, tile, this.buildingType, owner.faction);
    this.status = ok ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
    if (ok) owner.lastGoal = `build:${this.buildingType}`;
  }
}
