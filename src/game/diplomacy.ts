/**
 * M_V6.DIPLO.RELATION-MACHINE — per-pair faction Relation state machine.
 *
 * Architectural decisions (the v0.6 directive's §2 use-case enumeration):
 *   - Per-pair Relation: each (factionA, factionB) pair has its own
 *     state in `{ neutral | ally | enemy | tributary }`.
 *   - Symmetric storage: relationKey(a, b) sorts the two ids so
 *     `a|b === b|a` — one Map entry per unordered pair.
 *   - Default = `neutral` (no entry in the Map → neutral).
 *   - CombatEvaluator filters `ally` targets out of EnemyTarget
 *     assignment (M_V6.DIPLO.BORDER-ASK + .TRIBUTE wire downstream).
 *   - `tributary` factions auto-cede 10% of per-second resource accrual
 *     to the dominant faction (M_V6.DIPLO.TRIBUTE wires the cession
 *     into deposit / scoring tick).
 *
 * v0.6 substrate ships the state machine + reader helpers. Each of the
 * three diplomacy mechanics (BORDER-ASK / TRADE / TRIBUTE) wires its
 * own transitions on top of this substrate.
 */
import type { FactionId } from '@/config/factions';

/** The four valid relation states between any two factions. */
export type Relation = 'neutral' | 'ally' | 'enemy' | 'tributary';

/**
 * One pair's relation entry. `dominant` matters only for `tributary`
 * (the faction RECEIVING the cession) — null for symmetric relations
 * (neutral / ally / enemy).
 */
export interface RelationEntry {
  relation: Relation;
  /** Tributary-only: the dominant faction receiving the 10% cession. */
  dominant: FactionId | null;
  /** Sim-seconds at which the relation entered its current state. */
  sinceClockSeconds: number;
}

/** Build the sorted pair key for symmetric Map storage. */
export function relationKey(a: FactionId, b: FactionId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** The diplomacy substrate carried on GameState. */
export interface DiplomacyState {
  /** Map<relationKey(a, b), RelationEntry>. Absent entry = neutral. */
  relations: Map<string, RelationEntry>;
}

/** Build the initial empty diplomacy state (every pair is neutral). */
export function createDiplomacyState(): DiplomacyState {
  return { relations: new Map() };
}

/**
 * Read the relation between two factions. Same-id query returns
 * 'ally' (a faction is allied with itself; CombatEvaluator already
 * skips own-faction targets, but this keeps the helper total).
 * Absent entry = 'neutral'.
 */
export function getRelation(state: DiplomacyState, a: FactionId, b: FactionId): Relation {
  if (a === b) return 'ally';
  return state.relations.get(relationKey(a, b))?.relation ?? 'neutral';
}

/**
 * Read the full entry (relation + dominant + sinceClockSeconds) for a
 * pair. Returns null when the pair is in default 'neutral' state.
 */
export function getRelationEntry(
  state: DiplomacyState,
  a: FactionId,
  b: FactionId,
): RelationEntry | null {
  if (a === b) return null;
  return state.relations.get(relationKey(a, b)) ?? null;
}

/**
 * Set the relation between two factions. Same-id is a no-op (you can't
 * declare yourself an ally / enemy). The clock argument stamps
 * `sinceClockSeconds` so downstream timing (tribute cooldown, alliance
 * decay, etc.) can read how long the relation has held.
 */
export function setRelation(
  state: DiplomacyState,
  a: FactionId,
  b: FactionId,
  relation: Relation,
  clockSeconds: number,
  dominant: FactionId | null = null,
): void {
  if (a === b) return;
  const key = relationKey(a, b);
  if (relation === 'neutral') {
    state.relations.delete(key);
    return;
  }
  state.relations.set(key, {
    relation,
    dominant,
    sinceClockSeconds: clockSeconds,
  });
}

/**
 * Convenience: is the pair currently allied? Used by CombatEvaluator
 * to filter ally targets out of EnemyTarget assignment.
 */
export function isAlly(state: DiplomacyState, a: FactionId, b: FactionId): boolean {
  return getRelation(state, a, b) === 'ally';
}

/**
 * Convenience: is the pair currently in 'enemy' state (explicit war)?
 * Used by the auto-tribute escalation when refusal flips Relation to
 * enemy + adds a wave-of-attack bonus.
 */
export function isEnemy(state: DiplomacyState, a: FactionId, b: FactionId): boolean {
  return getRelation(state, a, b) === 'enemy';
}

/**
 * Return the dominant faction in a tributary relationship between a + b,
 * or null when the pair is not tributary. The dominant is the faction
 * RECEIVING the per-second 10% cession; the tributary is the one PAYING.
 */
export function tributaryDominant(
  state: DiplomacyState,
  a: FactionId,
  b: FactionId,
): FactionId | null {
  const entry = getRelationEntry(state, a, b);
  if (!entry || entry.relation !== 'tributary') return null;
  return entry.dominant;
}
