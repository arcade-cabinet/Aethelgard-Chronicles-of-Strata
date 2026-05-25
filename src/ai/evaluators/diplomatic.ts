/**
 * M_V8.AI.DIPLO-EVALUATOR — DiplomaticEvaluator + DiplomaticGoal.
 *
 * Verb 6: the AI considers diplomacy actions each brain arbitration.
 * Priority weight: below Military (combat wins over diplomacy),
 * above Patrol (diplomacy over idle patrol).
 *
 * Three diplomacy actions are evaluated in order of preference:
 *   1. ProposePact — borders touching AND not already ally/enemy
 *   2. DemandTribute — AI supply ≥ 2× target supply
 *   3. AcceptTribute — AI is clearly weaker than a dominant faction
 *      (the weaker faction accepts to avoid conflict)
 *
 * Uses the existing diplomacy-border.ts + diplomacy-tribute.ts
 * primitives; no new simulation state.
 *
 * Post-review fix (M_V8.REVIEWER.FULL-CYCLE):
 *   - H-2: game.zones accessed by string key (supports N-player factions)
 *   - H-3+H-4: _pickAction returns {action, targetId} — no double-call,
 *     no duplicated loop body in DiplomaticGoal.activate()
 *   - H-5: const enum replaced with const object (isolatedModules safe)
 */
import { Goal, GoalEvaluator } from 'yuka';
import { bordersAreTouching, proposeNonAggressionPact } from '@/game/diplomacy-border';
import { canDemandTribute, acceptTribute } from '@/game/diplomacy-tribute';
import { getRelation } from '@/game/diplomacy';
import { economyFor } from '@/game/economy-for';
import type { AiPlayer } from '@/ai/ai-player';

/** Diplomacy action identifier. */
const DiploAction = {
  ProposePact: 'propose-pact',
  DemandTribute: 'demand-tribute',
  AcceptTribute: 'accept-tribute',
} as const;
type DiploAction = (typeof DiploAction)[keyof typeof DiploAction];

/** Resolved action + target faction id. */
interface DiploDecision {
  action: DiploAction;
  /** The faction id this action targets. */
  targetId: string;
}

export class DiplomaticEvaluator extends GoalEvaluator<AiPlayer> {
  constructor(private readonly personalityMul: number = 1.0) {
    super();
  }

  calculateDesirability(owner: AiPlayer): number {
    if (!owner.game) return 0;
    if (owner.game.outcome !== 'playing') return 0;
    // Diplomacy is a 4X / age-of-strata concern; skip in simple modes.
    if (owner.game.factions.length < 2) return 0;

    const decision = this._pickDecision(owner);
    if (!decision) return 0;

    // Base desirability: between Military (0.5–1.5) and Patrol (0.25).
    return 0.4 * this.personalityMul;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    const decision = this._pickDecision(owner);
    if (!decision) return;
    owner.brain.addSubgoal(new DiplomaticGoal(owner, decision));
  }

  /**
   * Pick the highest-priority available diplomacy action + target faction.
   * Returns null when no action is feasible this arbitration.
   *
   * Priority: ProposePact > DemandTribute > AcceptTribute.
   */
  private _pickDecision(owner: AiPlayer): DiploDecision | null {
    const game = owner.game;
    if (!game) return null;

    const myId = owner.faction as string;
    // H-2 fix: index zones by string — supports N-player faction ids.
    const myZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[myId];
    const myEco = economyFor(game, myId);

    for (const fc of game.factions) {
      if (fc.id === myId) continue;

      const rel = getRelation(game.diplomacy, myId, fc.id);
      // H-2 fix: index zones by string for any faction id.
      const theirZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[fc.id];

      // 1. Propose a non-aggression pact if borders touch and not yet allied or enemy.
      if (rel === 'neutral' && myZone && theirZone && bordersAreTouching(myZone, theirZone)) {
        return { action: DiploAction.ProposePact, targetId: fc.id };
      }

      // 2. Demand tribute if clearly dominant.
      if (rel === 'neutral' || rel === 'ally') {
        const theirEco = economyFor(game, fc.id);
        if (canDemandTribute(myEco, theirEco)) {
          return { action: DiploAction.DemandTribute, targetId: fc.id };
        }
      }

      // 3. Accept tribute if clearly weaker (avoid conflict with the dominant).
      if (rel === 'neutral') {
        const theirEco = economyFor(game, fc.id);
        if (canDemandTribute(theirEco, myEco)) {
          return { action: DiploAction.AcceptTribute, targetId: fc.id };
        }
      }
    }

    return null;
  }
}

/** Executes the selected diplomacy action immediately (fire-and-forget). */
class DiplomaticGoal extends Goal<AiPlayer> {
  constructor(
    owner: AiPlayer,
    private readonly decision: DiploDecision,
  ) {
    super(owner);
  }

  activate(): void {
    const owner = this.owner as AiPlayer;
    const game = owner.game;
    if (!game) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    const myId = owner.faction as string;
    const myZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[myId];
    const myEco = economyFor(game, myId);
    const nowSeconds = game.clock.elapsed;
    const { action, targetId } = this.decision;

    switch (action) {
      case DiploAction.ProposePact: {
        const theirZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[targetId];
        if (theirZone && myZone && bordersAreTouching(myZone, theirZone)) {
          proposeNonAggressionPact(
            game.diplomacyProposals,
            game.diplomacy,
            myId,
            targetId,
            nowSeconds,
          );
        }
        break;
      }
      case DiploAction.DemandTribute: {
        const theirEco = economyFor(game, targetId);
        if (canDemandTribute(myEco, theirEco)) {
          // Auto-accept on behalf of the dominant AI faction: the tributary
          // AI will comply. A future UI wires the human-player refusal path.
          acceptTribute(game.diplomacy, targetId, myId, nowSeconds);
        }
        break;
      }
      case DiploAction.AcceptTribute: {
        const theirEco = economyFor(game, targetId);
        if (canDemandTribute(theirEco, myEco)) {
          // Weaker AI accepts the dominant's implicit tribute claim.
          acceptTribute(game.diplomacy, myId, targetId, nowSeconds);
        }
        break;
      }
    }

    this.status = Goal.STATUS.COMPLETED;
  }

  execute(): void {
    /* fire-and-forget; all work done in activate() */
  }

  terminate(): void {
    /* nothing to clean up */
  }
}
