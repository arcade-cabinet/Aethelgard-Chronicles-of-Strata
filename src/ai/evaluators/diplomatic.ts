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
import { personalityFor } from '@/config/ai';
import type { AiPlayer } from '@/ai/ai-player';
import { getRelation, setRelation } from '@/game/diplomacy';
import { bordersAreTouching, proposeNonAggressionPact } from '@/game/diplomacy-border';
import { acceptTribute, canDemandTribute, hasHadContact } from '@/game/diplomacy-tribute';
import { economyFor } from '@/game/economy-for';

/**
 * M_V12.AI-DIPLO.BREAK-PACT — per-pair cooldown to prevent
 * break/repact flap. Keyed by `${myId}|${targetId}` so each
 * directional break has its own clock. Cleared on game reset is
 * not necessary — entries are bounded by faction-pair count and
 * the cooldown window naturally ages out.
 */
const BREAK_PACT_COOLDOWN = new Map<string, number>();
const BREAK_PACT_COOLDOWN_SECONDS = 60;

/** Diplomacy action identifier. */
const DiploAction = {
  ProposePact: 'propose-pact',
  DemandTribute: 'demand-tribute',
  AcceptTribute: 'accept-tribute',
  // M_V12.AI-DIPLO.BREAK-PACT — break a current alliance when the
  // personality favors it AND relative-power conditions match.
  BreakPact: 'break-pact',
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
    const myZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[
      myId
    ];
    const myEco = economyFor(game, myId);

    for (const fc of game.factions) {
      if (fc.id === myId) continue;

      const rel = getRelation(game.diplomacy, myId, fc.id);
      // H-2 fix: index zones by string for any faction id.
      const theirZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[
        fc.id
      ];

      // 1. Propose a non-aggression pact if borders touch and not yet allied or enemy.
      // CodeRabbit PR #44: also skip if there's already a pending proposal
      // either direction — proposeNonAggressionPact would reject it, but the
      // evaluator would still claim feasibility and crowd out actionable goals.
      if (rel === 'neutral' && myZone && theirZone && bordersAreTouching(myZone, theirZone)) {
        const hasPending = game.diplomacyProposals.pending.some(
          (p) =>
            (p.proposer === myId && p.target === fc.id) ||
            (p.proposer === fc.id && p.target === myId),
        );
        if (!hasPending) {
          return { action: DiploAction.ProposePact, targetId: fc.id };
        }
      }

      // 2. Demand tribute if clearly dominant. Gated by has-had-contact
      // (M_V11.EVENTS.RTS-TRIGGERED): a faction cannot demand tribute
      // from one it hasn't yet met. Lore — the messenger has to know
      // where to ride.
      const contact = () => hasHadContact(game.diplomacy, myId, fc.id);
      if (rel === 'neutral' || rel === 'ally') {
        const theirEco = economyFor(game, fc.id);
        if (canDemandTribute(myEco, theirEco, contact)) {
          return { action: DiploAction.DemandTribute, targetId: fc.id };
        }
      }

      // 3. Accept tribute if clearly weaker (avoid conflict with the dominant).
      if (rel === 'neutral') {
        const theirEco = economyFor(game, fc.id);
        if (canDemandTribute(theirEco, myEco, contact)) {
          return { action: DiploAction.AcceptTribute, targetId: fc.id };
        }
      }

      // 4. Break pact when ahead AND personality favors it.
      //    M_V12.AI-DIPLO.BREAK-PACT — gated on:
      //      - currently allied,
      //      - relative-power gap: my used-supply ≥ 1.5× theirs,
      //      - personality diploBias.break ≥ 0.5 threshold,
      //      - per-pair cooldown ≥ 60 sim-seconds since last break
      //        (reviewer M5 fix: prevents break/repact flap when an
      //        ally re-offers immediately).
      if (rel === 'ally') {
        // CodeRabbit MEDIUM fix: defensive guard on economyFor.
        // Returns undefined for a defeated/invalid faction; skip
        // BreakPact evaluation cleanly instead of throwing a
        // TypeError on .usedSupply. personalityFor returns a non-
        // nullable Personality so it stays safe.
        const theirEco = economyFor(game, fc.id);
        if (!theirEco) continue;
        const ratio = (myEco.usedSupply + 1) / (theirEco.usedSupply + 1);
        const personality = personalityFor(owner.personalityKey);
        const breakBias = personality.diploBias?.break ?? 0;
        const cooldownKey = `${myId}|${fc.id}`;
        const now = game.clock.elapsed;
        const lastBreak = BREAK_PACT_COOLDOWN.get(cooldownKey) ?? -Infinity;
        // CodeRabbit MAJOR fix: a new match resets game.clock.elapsed
        // near 0; an entry from a prior match could block BreakPact
        // for the rest of the new match. `now < lastBreak` means
        // we've crossed a match boundary — treat as no prior break.
        const cooledDown = now < lastBreak || now - lastBreak >= BREAK_PACT_COOLDOWN_SECONDS;
        // CodeRabbit MAJOR fix: do NOT mutate the cooldown here.
        // _pickDecision is called from BOTH calculateDesirability +
        // setGoal, so writing the cooldown on each probe would burn
        // it before activate() runs. The cooldown is stamped in
        // DiplomaticGoal.activate's BreakPact case (single-fire).
        if (ratio >= 1.5 && breakBias >= 0.5 && cooledDown) {
          return { action: DiploAction.BreakPact, targetId: fc.id };
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
    const myZone = (game.zones as Record<string, import('@/game/zone').ZoneState | undefined>)[
      myId
    ];
    const myEco = economyFor(game, myId);
    const nowSeconds = game.clock.elapsed;
    const { action, targetId } = this.decision;

    switch (action) {
      case DiploAction.ProposePact: {
        const theirZone = (
          game.zones as Record<string, import('@/game/zone').ZoneState | undefined>
        )[targetId];
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
      case DiploAction.BreakPact: {
        // M_V12.AI-DIPLO.BREAK-PACT — setRelation(neutral) drops
        // the relation row. Diplomatic-overture rejoin path stays
        // open afterward (the alliance was broken, not vetoed
        // permanently). A future cycle could record a -1 trust
        // score the propose-pact gate consults.
        setRelation(game.diplomacy, myId, targetId, 'neutral', nowSeconds);
        // CodeRabbit MAJOR fix: stamp the cooldown HERE (in activate)
        // not in _pickDecision, so the cooldown is set once on actual
        // commit instead of on every desirability probe.
        BREAK_PACT_COOLDOWN.set(`${myId}|${targetId}`, nowSeconds);
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
