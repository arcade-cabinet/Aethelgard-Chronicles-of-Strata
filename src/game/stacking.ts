/**
 * M_GAME.STACK.2 + M_GAME.STACK.5 — Stack creation + dissolution.
 *
 * Pure-data commands that compose the koota Stack/StackMember
 * substrate. Visual concerns (member-mesh teleport lerp, stack
 * badge render) live in the render layer (M_GAME.STACK.8); these
 * functions only mutate ECS state.
 */
import type { Entity } from 'koota';
import {
  Combatant,
  FactionTrait,
  Health,
  Stack,
  StackMember,
  Unit,
  type UnitType,
} from '@/ecs/components';
import {
  defaultFormationFor,
  dominantUnitTypeOf,
  FORMATIONS,
  type MemberAggregate,
} from '@/world/formations';
import type { GameState } from './game-state';

/** Max members per stack (per docs/specs/201-stacking-and-formations.md). */
export const MAX_STACK_SIZE = 8;

/** Outcome of an attempted stack creation. */
export interface StackResult {
  ok: boolean;
  /** The created stack entity (on success). */
  stack?: Entity;
  /** Why the attempt failed (on !ok), human-readable. */
  reason?: string;
}

/**
 * Aggregate the member traits the formation modifier needs.
 * Members with no Combatant component contribute 0 damage / Infinity
 * cooldown (the Infinity drops out via min() if any combatant is
 * present; if none are, DPS will be 0 which is correct for peon
 * Work Crews).
 */
function aggregateMembers(members: Entity[]): MemberAggregate {
  const unitTypes: UnitType[] = [];
  let sumMaxHp = 0;
  let sumAttackDamage = 0;
  let minAttackCooldown = Infinity;
  for (const m of members) {
    const u = m.get(Unit);
    if (u) unitTypes.push(u.unitType);
    const h = m.get(Health);
    if (h) sumMaxHp += h.max;
    const c = m.get(Combatant);
    if (c) {
      sumAttackDamage += c.attackDamage;
      if (c.attackCooldown > 0 && c.attackCooldown < minAttackCooldown) {
        minAttackCooldown = c.attackCooldown;
      }
    }
  }
  if (!Number.isFinite(minAttackCooldown)) minAttackCooldown = 0;
  return { unitTypes, sumMaxHp, sumAttackDamage, minAttackCooldown };
}

/**
 * Create a Stack from `members`. Validates:
 *   - 2 <= members.length <= MAX_STACK_SIZE
 *   - all members share the same FactionTrait.faction
 *   - none are already part of another stack (StackMember absent)
 *   - the resolved default formation accepts the unit-type composition
 *
 * On success: spawns a Stack entity at the first member's HexPosition,
 * sets each member's StackMember.stackId back-reference, and records
 * combined stats from the formation's combine() function.
 */
export function createStack(game: GameState, members: Entity[]): StackResult {
  if (members.length < 2) {
    return { ok: false, reason: 'Need at least 2 members to form a stack.' };
  }
  if (members.length > MAX_STACK_SIZE) {
    return { ok: false, reason: `Max stack size is ${MAX_STACK_SIZE}.` };
  }
  const factions = new Set<string>();
  for (const m of members) {
    const f = m.get(FactionTrait)?.faction;
    if (f === undefined) {
      return { ok: false, reason: 'Member missing FactionTrait.' };
    }
    factions.add(f);
    if (m.has(StackMember)) {
      return { ok: false, reason: 'Member already in a stack.' };
    }
  }
  if (factions.size !== 1) {
    return { ok: false, reason: 'Stack members must share a faction.' };
  }
  const agg = aggregateMembers(members);
  const formationId = defaultFormationFor(agg.unitTypes);
  const spec = FORMATIONS[formationId];
  if (!spec.validate(agg.unitTypes)) {
    return { ok: false, reason: `Composition invalid for ${spec.name}.` };
  }
  const stats = spec.combine(agg);

  const stack = game.world.spawn(Stack);
  const stackId = stack.id();
  stack.set(Stack, {
    members: members.map((m) => m.id()),
    formationId,
    combinedHp: stats.combinedMaxHp,
    combinedMaxHp: stats.combinedMaxHp,
    combinedDps: stats.combinedDps,
    dominantUnitType: dominantUnitTypeOf(agg.unitTypes),
  });
  for (const m of members) {
    if (!m.has(StackMember)) m.add(StackMember);
    m.set(StackMember, { stackId });
  }
  return { ok: true, stack };
}

/**
 * Dissolve a Stack: removes the Stack entity, clears each member's
 * StackMember back-reference. Members keep their HexPosition / Unit
 * traits unchanged — they revert to acting as individuals.
 *
 * Idempotent: calling on an already-dissolved Stack is a no-op.
 */
export function dissolveStack(game: GameState, stack: Entity): void {
  const s = stack.get(Stack);
  if (!s) return;
  const stackId = stack.id();
  for (const memberEntity of game.world.query(StackMember)) {
    if (memberEntity.get(StackMember)?.stackId === stackId) {
      memberEntity.remove(StackMember);
    }
  }
  stack.destroy();
}

/**
 * Apply damage to a stack. Damage is dealt to combinedHp; once
 * combinedHp <= 0 the stack auto-dissolves and surviving members
 * (if any — combined-HP zero implies all dead by definition of the
 * combined-stats model) revert to individual entities for the death
 * system to clean up.
 *
 * Returns the post-damage combinedHp (0 if dissolved).
 */
export function damageStack(game: GameState, stack: Entity, damage: number): number {
  const s = stack.get(Stack);
  if (!s) return 0;
  const next = Math.max(0, s.combinedHp - damage);
  stack.set(Stack, { ...s, combinedHp: next });
  if (next <= 0) {
    dissolveStack(game, stack);
    return 0;
  }
  // Proportional member kills (M_GAME.STACK.4): if the stack took
  // ≥ 1 / N of its combinedHp this hit, kill the appropriate member
  // count (rounding toward preserving the dominant unit type — for
  // now simply truncates; finer ordering ships with combat).
  const memberCount = s.members.length;
  if (memberCount > 0) {
    const dmgFraction = damage / s.combinedMaxHp;
    const killCount = Math.floor(dmgFraction * memberCount);
    if (killCount > 0) {
      // Drop the last K members (non-dominant types preferred — to
      // be refined in STACK.4; for now last-wins).
      const killedIds = new Set(s.members.slice(memberCount - killCount));
      const survivors = s.members.slice(0, memberCount - killCount);
      stack.set(Stack, { ...s, combinedHp: next, members: survivors });
      // Gemini PR #65 — clean up the orphaned member entities. The
      // prior shape removed them from the Stack.members array but
      // left their ECS entities (with StackMember back-references
      // still pointing at this stack) leaked in the world. Destroy
      // them so the existing death/cleanup systems see consistent
      // state.
      for (const memberEntity of game.world.query(StackMember)) {
        if (killedIds.has(memberEntity.id())) {
          memberEntity.destroy();
        }
      }
      if (survivors.length <= 1) {
        // Single-member or zero — auto-unstack.
        dissolveStack(game, stack);
        return next;
      }
    }
  }
  return next;
}
