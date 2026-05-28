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
  type FormationId,
  Health,
  HexPosition,
  PathQueue,
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
} from '@/world/board';
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

  // M_V11.STACK.STEP-LERP — pick the FIRST member's tile as the
  // canonical stack tile. The rest of the members will path to it
  // via a single-step PathQueue queued below; pathFollowSystem
  // lerps their Transform over its existing per-tick step distance
  // (~200ms for a 1-hex adjacent move at default speed). Members
  // already on the stack tile get an empty queue (no-op).
  const firstMember = members[0];
  const stackHex = firstMember?.get(HexPosition);
  const stackTileKey = stackHex ? `${stackHex.q},${stackHex.r}` : undefined;

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
    // M_V11.STACK.STEP-LERP — non-stack-tile members get a
    // single-step PathQueue toward the stack tile. The
    // pathFollowSystem walks Transform along the existing
    // per-tick step distance + flips HexPosition on arrival;
    // the visual effect is a snappy lerp into formation.
    if (!stackTileKey || !stackHex) continue;
    const hex = m.get(HexPosition);
    if (!hex || (hex.q === stackHex.q && hex.r === stackHex.r)) continue;
    if (!m.has(PathQueue)) m.add(PathQueue);
    const stepKey = `${stackTileKey},${stackHex.level}`;
    m.set(PathQueue, { steps: [stepKey] });
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
/**
 * M_V11.STACK.PANEL — switch a Stack's formation. Returns a
 * StackResult-shaped { ok, reason } so the HUD can disable buttons
 * + surface a tooltip when a switch is rejected. Validates:
 *
 *   1. Stack exists + has members.
 *   2. Target formation exists.
 *   3. Composition validates against the target formation's predicate.
 *   4. Discovery (if any) is owned by the stack's faction.
 *   5. Stack is NOT mid-combat (any member's Combatant.attackTimer > 0
 *      counts as mid-combat — switching formation mid-swing is the
 *      forbidden state per spec).
 *
 * On success: re-aggregates members, runs the new formation's combine()
 * to recompute combinedHp / combinedMaxHp / combinedDps, persists.
 */
export function setStackFormation(
  game: GameState,
  stack: Entity,
  targetId: FormationId,
): StackResult {
  const s = stack.get(Stack);
  if (!s) return { ok: false, reason: 'Stack does not exist.' };
  const spec = FORMATIONS[targetId];
  if (!spec) return { ok: false, reason: `Unknown formation: ${targetId}.` };

  // Gather live member entities + their unit types.
  const memberEntities: Entity[] = [];
  const memberIds = new Set(s.members);
  for (const e of game.world.query(StackMember, Unit)) {
    if (memberIds.has(e.id())) memberEntities.push(e);
  }
  if (memberEntities.length < 2) {
    return { ok: false, reason: 'Stack has too few members for a switch.' };
  }

  // Composition validate.
  const agg = aggregateMembers(memberEntities);
  if (!spec.validate(agg.unitTypes)) {
    return { ok: false, reason: `Composition invalid for ${spec.name}.` };
  }

  // Discovery gate. game.research.purchased is a shared session
  // Set — Discoveries are not per-faction in v0.11 (a future
  // M_RESEARCH.PER-FACTION ticket would split). The mid-combat gate
  // below covers the "you can't switch a stack in active combat",
  // which is the practical asymmetry between human + AI today.
  if (spec.unlockDiscovery !== null) {
    const owned = game.research?.purchased ?? new Set<string>();
    if (!owned.has(spec.unlockDiscovery as never)) {
      return { ok: false, reason: `Requires Discovery: ${spec.unlockDiscovery}.` };
    }
  }

  // Mid-combat gate.
  for (const e of memberEntities) {
    const c = e.get(Combatant);
    if (c && c.attackTimer > 0) {
      return { ok: false, reason: 'Cannot switch formation mid-combat.' };
    }
  }

  // Recompute stats with the new formation modifier. Preserve the
  // current combinedHp ratio so a half-dead stack stays half-dead
  // after the switch (don't free-heal them).
  const stats = spec.combine(agg);
  // CodeRabbit (PR #89): clamp projected HP so a positive stack can't
  // round to 0 (Math.round of a fractional ratio*maxHp could land just
  // under 0.5) and so an upward-drifting ratio doesn't exceed maxHp.
  // A stack that had any HP keeps at least 1; a zero-max stack dies.
  const ratio = s.combinedMaxHp > 0 ? s.combinedHp / s.combinedMaxHp : 1;
  const rawProjected = Math.round(stats.combinedMaxHp * ratio);
  const nextHp =
    stats.combinedMaxHp <= 0
      ? 0
      : Math.min(stats.combinedMaxHp, Math.max(s.combinedHp > 0 ? 1 : 0, rawProjected));
  stack.set(Stack, {
    ...s,
    formationId: targetId,
    combinedMaxHp: stats.combinedMaxHp,
    combinedHp: nextHp,
    combinedDps: stats.combinedDps,
  });
  return { ok: true, stack };
}

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
    // M_V11.NOTIF.STACK-DISSOLVED — capture the stack's last tile
    // position from any member BEFORE dissolving, so the toast can
    // tap-to-focus there. dissolveStack removes the back-refs.
    const focusTile = lookupAnyMemberTile(game, s.members);
    dissolveStack(game, stack);
    emitStackDissolvedToast(focusTile);
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
        // M_V11.NOTIF.STACK-DISSOLVED — capture the surviving (or
        // last-known) member tile before the dissolve clears refs.
        const focusTile = lookupAnyMemberTile(game, survivors);
        // Single-member or zero — auto-unstack.
        dissolveStack(game, stack);
        emitStackDissolvedToast(focusTile);
        return next;
      }
    }
  }
  return next;
}

/**
 * M_V11.NOTIF.STACK-DISSOLVED — find the hex tile of any still-
 * alive member of the dissolving stack. Used to populate the
 * tap-to-focus payload on the dissolve toast. Falls back to
 * `null` if no member has a HexPosition (e.g. all members
 * already destroyed via the proportional-kill path).
 */
function lookupAnyMemberTile(
  game: GameState,
  memberIds: number[],
): { q: number; r: number } | null {
  if (memberIds.length === 0) return null;
  const ids = new Set(memberIds);
  for (const e of game.world.query(HexPosition)) {
    if (!ids.has(e.id())) continue;
    const pos = e.get(HexPosition);
    if (pos) return { q: pos.q, r: pos.r };
  }
  return null;
}

/**
 * M_V11.NOTIF.STACK-DISSOLVED — info-tone toast on auto-dissolve.
 * Tap-to-focus when we managed to capture a member tile.
 */
function emitStackDissolvedToast(focusTile: { q: number; r: number } | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('aethelgard:toast', {
      detail: {
        id: focusTile ? `stack-dissolved-${focusTile.q}-${focusTile.r}` : 'stack-dissolved',
        tone: 'info',
        title: 'Cohort broken',
        description: 'A stack lost its formation cohesion and dissolved into individuals.',
        ...(focusTile ? { focus: focusTile } : {}),
      },
    }),
  );
}
