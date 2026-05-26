/**
 * M_GAME.STACK.6 — Formation registry.
 *
 * Per docs/specs/201-stacking-and-formations.md, each formation
 * declares: a composition validator (which compositions of UnitType
 * are legal), a stat modifier function (how member combined stats
 * are weighted vs the pure sum), a badge id for HUD rendering, and
 * the Discovery id that unlocks it (null for defaults: 'rabble' and
 * 'work-crew' are always available).
 */
import type { FormationId, UnitType } from '@/ecs/components';

/** Aggregated member stats fed INTO the formation modifier. */
export interface MemberAggregate {
  /** Members' UnitType list (one per member). */
  unitTypes: UnitType[];
  /** Sum of members' max HP. */
  sumMaxHp: number;
  /** Sum of members' attack damage. */
  sumAttackDamage: number;
  /** Min attackCooldown (the fastest member sets the stack tempo). */
  minAttackCooldown: number;
}

/** What the formation modifier produces — the combined stats the Stack uses. */
export interface CombinedStats {
  combinedMaxHp: number;
  /** Total damage-per-second the stack outputs (modifier-applied). */
  combinedDps: number;
}

export interface FormationSpec {
  id: FormationId;
  /** Display name for the SelectionPanel formation chip. */
  name: string;
  /** Discovery id that unlocks this formation; null = default-available. */
  unlockDiscovery: string | null;
  /** Whether a candidate member composition is legal for this formation. */
  validate(unitTypes: UnitType[]): boolean;
  /** Derive combined-stats from member aggregates. */
  combine(agg: MemberAggregate): CombinedStats;
}

/** Pure-sum DPS = sum-damage / min-cooldown (fastest member sets tempo). */
function pureDps(agg: MemberAggregate): number {
  if (agg.minAttackCooldown <= 0) return 0;
  return agg.sumAttackDamage / agg.minAttackCooldown;
}

const MELEE_UNITS = new Set<UnitType>(['Footman', 'Hero', 'Goblin', 'Orc', 'BlackKnight']);
const RANGED_UNITS = new Set<UnitType>(['Wizard', 'Witch']);
const SPEAR_UNITS = new Set<UnitType>(['Footman']); // Pikeman not yet in roster
const PEON_UNITS = new Set<UnitType>(['Peon']);

/**
 * Default formation: any same-faction military unit mix. No stat
 * modifier — combined stats are the pure sum. Always available.
 */
const RABBLE: FormationSpec = {
  id: 'rabble',
  name: 'Rabble',
  unlockDiscovery: null,
  validate: (units) => units.length >= 2 && units.every((u) => !PEON_UNITS.has(u)),
  combine: (agg) => ({ combinedMaxHp: agg.sumMaxHp, combinedDps: pureDps(agg) }),
};

const PHALANX: FormationSpec = {
  id: 'phalanx',
  name: 'Phalanx',
  unlockDiscovery: 'formation-phalanx',
  validate: (units) => units.length >= 2 && units.every((u) => SPEAR_UNITS.has(u)),
  combine: (agg) => ({
    // +50% defense (combinedMaxHp ×1.5) — defense reads as effective HP.
    combinedMaxHp: Math.round(agg.sumMaxHp * 1.5),
    // −20% move speed and same DPS; speed is tracked per-stack-step elsewhere.
    combinedDps: pureDps(agg),
  }),
};

const CADRE: FormationSpec = {
  id: 'cadre',
  name: 'Cadre',
  unlockDiscovery: 'formation-cadre',
  validate: (units) => units.length >= 2 && units.every((u) => MELEE_UNITS.has(u)),
  combine: (agg) => ({
    combinedMaxHp: agg.sumMaxHp,
    // +25% melee damage.
    combinedDps: pureDps(agg) * 1.25,
  }),
};

const WEDGE: FormationSpec = {
  id: 'wedge',
  name: 'Wedge',
  unlockDiscovery: 'formation-wedge',
  validate: (units) => units.length >= 2 && units.every((u) => u === 'Hero' || u === 'BlackKnight'),
  combine: (agg) => ({
    combinedMaxHp: agg.sumMaxHp,
    // +25% damage on first attack — averaged across engagements ≈ +15%.
    combinedDps: pureDps(agg) * 1.15,
  }),
};

const SKIRMISH_LINE: FormationSpec = {
  id: 'skirmish-line',
  name: 'Skirmish Line',
  unlockDiscovery: 'formation-skirmish-line',
  validate: (units) => units.length >= 2 && units.every((u) => RANGED_UNITS.has(u)),
  combine: (agg) => ({
    combinedMaxHp: agg.sumMaxHp,
    // +15% range — DPS is range-gated, average +10% effective DPS.
    combinedDps: pureDps(agg) * 1.1,
  }),
};

const SQUARE: FormationSpec = {
  id: 'square',
  name: 'Square',
  unlockDiscovery: 'formation-square',
  validate: (units) => units.length >= 2 && units.every((u) => MELEE_UNITS.has(u)),
  combine: (agg) => ({
    // +30% defense; no damage modifier; immobile (move speed = 0
    // enforced by the move system on this formation).
    combinedMaxHp: Math.round(agg.sumMaxHp * 1.3),
    combinedDps: pureDps(agg),
  }),
};

const COMBINED_ARMS: FormationSpec = {
  id: 'combined-arms',
  name: 'Combined Arms',
  unlockDiscovery: 'formation-combined-arms',
  validate: (units) => {
    if (units.length < 2) return false;
    const hasMelee = units.some((u) => MELEE_UNITS.has(u));
    const hasRanged = units.some((u) => RANGED_UNITS.has(u));
    // Requires offense + defense mix; mix detection = at least one
    // ranged AND at least one melee unit.
    return hasMelee && hasRanged;
  },
  combine: (agg) => ({
    // Union of Phalanx + Cadre, capped: +25% HP, +20% DPS.
    combinedMaxHp: Math.round(agg.sumMaxHp * 1.25),
    combinedDps: pureDps(agg) * 1.2,
  }),
};

const WORK_CREW: FormationSpec = {
  id: 'work-crew',
  name: 'Work Crew',
  unlockDiscovery: null,
  validate: (units) => units.length >= 2 && units.every((u) => PEON_UNITS.has(u)),
  combine: (agg) => ({
    // Peons don't combat; harvest-rate buff lives in the
    // harvest-system code, not here. Combat stats are pure sum.
    combinedMaxHp: agg.sumMaxHp,
    combinedDps: 0,
  }),
};

export const FORMATIONS: Record<FormationId, FormationSpec> = {
  rabble: RABBLE,
  phalanx: PHALANX,
  cadre: CADRE,
  wedge: WEDGE,
  'skirmish-line': SKIRMISH_LINE,
  square: SQUARE,
  'combined-arms': COMBINED_ARMS,
  'work-crew': WORK_CREW,
};

/**
 * Resolve a unit list to the most strategic default formation id.
 * Prefers the most-specific applicable formation (Phalanx for spear
 * mix, Wedge for cavalry, Skirmish Line for ranged, etc.) and falls
 * through to Rabble / Work Crew as defaults.
 */
export function defaultFormationFor(unitTypes: UnitType[]): FormationId {
  if (unitTypes.length === 0) return 'rabble';
  if (unitTypes.every((u) => PEON_UNITS.has(u))) return 'work-crew';
  // Other specializations require Discoveries — leave the default
  // as Rabble. The caller switches to a specific formation via
  // SelectionPanel "Switch Formation" once the Discovery is owned.
  return 'rabble';
}

/**
 * Pick the dominant UnitType for the formation badge: the type with
 * the largest member count; ties broken by first occurrence.
 */
export function dominantUnitTypeOf(unitTypes: UnitType[]): UnitType {
  const counts = new Map<UnitType, number>();
  for (const u of unitTypes) counts.set(u, (counts.get(u) ?? 0) + 1);
  let best: UnitType = unitTypes[0] ?? 'Footman';
  let bestCount = 0;
  for (const [u, c] of counts) {
    if (c > bestCount) {
      best = u;
      bestCount = c;
    }
  }
  return best;
}
