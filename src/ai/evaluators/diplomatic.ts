/**
 * M_V8.AI.DIPLO-EVALUATOR — DiplomaticEvaluator + DiplomaticGoal.
 *
 * Verb 6: the AI considers diplomacy actions each brain arbitration.
 * Priority weight: below Military (combat wins over diplomacy),
 * above Patrol (diplomacy over idle patrol).
 *
 * Three diplomacy actions are evaluated in order of preference:
 *   1. canProposePact — borders touching AND not already ally/enemy
 *   2. canDemandTribute — AI supply ≥ 2× target supply
 *   3. canAcceptTribute — AI is clearly weaker than a dominant faction
 *      (the weaker faction accepts to avoid conflict)
 *
 * Uses the existing diplomacy-border.ts + diplomacy-tribute.ts
 * primitives; no new simulation state.
 */
import { Goal, GoalEvaluator } from 'yuka';
import { bordersAreTouching, proposeNonAggressionPact } from '@/game/diplomacy-border';
import { canDemandTribute, acceptTribute } from '@/game/diplomacy-tribute';
import { getRelation } from '@/game/diplomacy';
import { economyFor } from '@/game/economy-for';
import type { AiPlayer } from '@/ai/ai-player';

/** Subgoal enum for the diplomatic action chosen this turn. */
const enum DiploAction {
  ProposePact = 'propose-pact',
  DemandTribute = 'demand-tribute',
  AcceptTribute = 'accept-tribute',
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

    const action = this._pickAction(owner);
    if (!action) return 0;

    // Base desirability: between Military (0.5–1.5) and Patrol (0.25).
    return 0.4 * this.personalityMul;
  }

  setGoal(owner: AiPlayer): void {
    owner.brain.clearSubgoals();
    const action = this._pickAction(owner);
    if (!action) return;
    owner.brain.addSubgoal(new DiplomaticGoal(owner, action));
  }

  /**
   * Pick the highest-priority available diplomacy action.
   * Returns null when no action is feasible this arbitration.
   */
  private _pickAction(owner: AiPlayer): DiploAction | null {
    const game = owner.game;
    if (!game) return null;

    const myId = owner.faction as string;
    const myZone = game.zones[owner.faction];
    const myEco = economyFor(game, myId);

    for (const fc of game.factions) {
      if (fc.id === myId) continue;

      const rel = getRelation(game.diplomacy, myId, fc.id);

      // 1. Propose a non-aggression pact if borders touch and not yet allied or enemy.
      if (rel === 'neutral' && myZone && game.zones[fc.id as 'player' | 'enemy']) {
        const theirZone = game.zones[fc.id as 'player' | 'enemy'];
        if (theirZone && bordersAreTouching(myZone, theirZone)) {
          return DiploAction.ProposePact;
        }
      }

      // 2. Demand tribute if clearly dominant.
      if (rel === 'neutral' || rel === 'ally') {
        const theirEco = economyFor(game, fc.id);
        if (canDemandTribute(myEco, theirEco)) {
          return DiploAction.DemandTribute;
        }
      }

      // 3. Accept tribute if clearly weaker (avoid conflict with the dominant).
      if (rel === 'neutral') {
        const theirEco = economyFor(game, fc.id);
        if (canDemandTribute(theirEco, myEco)) {
          return DiploAction.AcceptTribute;
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
    private readonly action: DiploAction,
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
    const myZone = game.zones[owner.faction];
    const myEco = economyFor(game, myId);
    const nowSeconds = game.clock.elapsed;

    switch (this.action) {
      case DiploAction.ProposePact: {
        for (const fc of game.factions) {
          if (fc.id === myId) continue;
          const rel = getRelation(game.diplomacy, myId, fc.id);
          if (rel !== 'neutral') continue;
          const theirZone = game.zones[fc.id as 'player' | 'enemy'];
          if (theirZone && myZone && bordersAreTouching(myZone, theirZone)) {
            proposeNonAggressionPact(
              game.diplomacyProposals,
              game.diplomacy,
              myId,
              fc.id,
              nowSeconds,
            );
            break;
          }
        }
        break;
      }
      case DiploAction.DemandTribute: {
        for (const fc of game.factions) {
          if (fc.id === myId) continue;
          const rel = getRelation(game.diplomacy, myId, fc.id);
          if (rel !== 'neutral' && rel !== 'ally') continue;
          const theirEco = economyFor(game, fc.id);
          if (canDemandTribute(myEco, theirEco)) {
            // Auto-accept on behalf of the dominant AI faction: the tributary
            // AI will comply. A future UI wires the human-player refusal path.
            acceptTribute(game.diplomacy, fc.id, myId, nowSeconds);
            break;
          }
        }
        break;
      }
      case DiploAction.AcceptTribute: {
        for (const fc of game.factions) {
          if (fc.id === myId) continue;
          const rel = getRelation(game.diplomacy, myId, fc.id);
          if (rel !== 'neutral') continue;
          const theirEco = economyFor(game, fc.id);
          if (canDemandTribute(theirEco, myEco)) {
            // Weaker AI accepts the dominant's implicit tribute claim.
            acceptTribute(game.diplomacy, myId, fc.id, nowSeconds);
            break;
          }
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
