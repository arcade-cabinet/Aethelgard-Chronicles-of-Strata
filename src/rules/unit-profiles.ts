/**
 * M_REGISTRY.1 — unified UNIT_PROFILES Thing registry.
 *
 * The second proof of the unified Thing registry (after BUILDING_PROFILES
 * in M_REGISTRY.5). Before this file, the per-unit-role branches in
 * `src/entities/character-factory.ts` (Peon → harvester+carrier+job;
 * Settler → job only; combat roles → health+combatant+offensive-emitter)
 * were a switch on `role`, and the damageType was a ternary inside the
 * OffensiveBehavior trait construction. Three role-shapes, three
 * branches, one ternary — exactly the parallel hierarchy
 * M_ARCH_UNIFY collapses.
 *
 * `UNIT_PROFILES` declares the slot tuple for each unit role: combat
 * stats (mirrored from combat.json so factories don't dual-read),
 * harvester wiring, carrier wiring, assignable-job wiring, damage type,
 * and a `nonCombat` flag (covers Peon + Settler — they bypass the
 * Health/Combatant/OffensiveBehavior block in character-factory). A
 * fourth role type drops in by adding ONE row and ONE damageType union
 * extension — no factory edit needed.
 */

import { unitStatFor } from '@/config/combat';
import type { UnitType } from '@/ecs/components';

/** Damage type for the OffensiveBehavior trait. */
export type DamageType = 'normal' | 'siege' | 'magic';

/**
 * Combat-role classification — extracted from 3 duplicate MILITARY sets
 * scattered across offensive-behavior.ts, TileInteraction.tsx, and
 * encroachment.ts (M_REGISTRY.17). `military` = targets enemies and is
 * targetable; `civilian` = peons + settlers (nonviolent, no encroach,
 * no right-click move targeting). The slot is read by every consumer
 * that needs "is this role a combatant" instead of each maintaining
 * its own role list.
 */
export type CombatRole = 'military' | 'civilian';

/**
 * Slot toggles for what kind of unit each role IS. Mirrors the M_ARCH_UNIFY
 * keystone's per-slot composition — building/unit/prop are all just
 * different slot tuples on the same Thing registry.
 */
export interface UnitProfile {
  /**
   * Whether the role participates in the harvest loop (Peon today).
   * Adds Harvester + Carrier + AssignedJob traits at spawn.
   */
  harvester: boolean;
  /**
   * Whether the role is a non-combat civilian (Peon + Settler today).
   * No Health/Combatant/EnemyTarget/OffensiveBehavior on spawn — the
   * unit is fragile and is governed by the worker/founding subsystems
   * instead of the combat tick.
   */
  nonCombat: boolean;
  /**
   * Whether the role carries the founding state machine (Settler).
   * Adds AssignedJob without the harvest traits. Distinct from
   * harvester via the `foundBase` command verb.
   */
  founder: boolean;
  /**
   * Damage type the OffensiveBehavior trait carries when this role
   * fights. Read for combat units only (nonCombat=false).
   */
  damageType: DamageType;
  /**
   * Combat-role classification — collapses the 3 duplicate MILITARY
   * sets that lived in offensive-behavior.ts, TileInteraction.tsx,
   * and encroachment.ts. `civilian` = peons + settlers; `military` =
   * everything that targets enemies (Footman, Trebuchet, all enemy
   * units). Trebuchet is military despite being slow; Witch is military.
   */
  combatRole: CombatRole;
  /**
   * Selection-ring scale for this role (M_REGISTRY.19) — the selection
   * ring sizes itself to match what's selected. Was a 4-branch ladder
   * in SelectionRing.tsx; now a per-profile slot read.
   */
  selectionRadius: number;
}

/**
 * The master Thing registry for unit roles. Add a unit type by adding a
 * row here AND a stat block to combat.json. The factory then composes
 * its trait list from named slot reads — no per-role branch in code.
 */
export const UNIT_PROFILES: Record<UnitType, UnitProfile> = {
  Peon: {
    harvester: true,
    nonCombat: true,
    founder: false,
    damageType: 'normal',
    combatRole: 'civilian',
    selectionRadius: 0.65,
  },
  Settler: {
    harvester: false,
    nonCombat: true,
    founder: true,
    damageType: 'normal',
    combatRole: 'civilian',
    selectionRadius: 0.85,
  },
  Footman: {
    harvester: false,
    nonCombat: false,
    founder: false,
    damageType: 'normal',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  Trebuchet: {
    harvester: false,
    nonCombat: false,
    founder: false,
    // Siege damage melts walls (M_FEATURE.5).
    damageType: 'siege',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  Wizard: {
    // M_EXPANSION.A.26 — player magic-damage ranged unit. Mid HP,
    // expensive (science prereq), spell visual (magic-spell SFX pack).
    harvester: false,
    nonCombat: false,
    founder: false,
    damageType: 'magic',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  Goblin: {
    harvester: false,
    nonCombat: false,
    founder: false,
    damageType: 'normal',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  Orc: {
    harvester: false,
    nonCombat: false,
    founder: false,
    damageType: 'normal',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  Vampire: {
    harvester: false,
    nonCombat: false,
    founder: false,
    damageType: 'normal',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  BlackKnight: {
    harvester: false,
    nonCombat: false,
    founder: false,
    damageType: 'normal',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
  Witch: {
    harvester: false,
    nonCombat: false,
    founder: false,
    // Magic damage cuts magic-armor (M_FEATURE.6).
    damageType: 'magic',
    combatRole: 'military',
    selectionRadius: 0.85,
  },
};

/** Resolve the unified profile for a unit role. */
export function unitProfileFor(role: UnitType): UnitProfile {
  return UNIT_PROFILES[role];
}

/**
 * Derived set of all military roles — collapses the 3 duplicate
 * MILITARY constants that lived in offensive-behavior.ts,
 * TileInteraction.tsx, and encroachment.ts (M_REGISTRY.17). Single
 * source of truth: the `combatRole` slot on UNIT_PROFILES. Adding
 * a new military unit role just sets combatRole='military' on its
 * profile; this set auto-extends.
 *
 * Note: this also CORRECTS a latent bug in the legacy MILITARY sets —
 * they omitted Trebuchet (which IS a military role with siege damage,
 * but the old hand-built sets missed it). After M_REGISTRY.17, the
 * derivation includes Trebuchet automatically.
 */
export const MILITARY_ROLES: ReadonlySet<UnitType> = new Set(
  (Object.entries(UNIT_PROFILES) as Array<[UnitType, UnitProfile]>)
    .filter(([, p]) => p.combatRole === 'military')
    .map(([role]) => role),
);

/**
 * Composite accessor — returns both the combat stats (from combat.json)
 * AND the unified profile (slot toggles + damage type). Factories that
 * need everything about a role read this ONE function instead of
 * pulling from two sources.
 */
export function thingProfileFor(role: UnitType) {
  return { stats: unitStatFor(role), profile: unitProfileFor(role) };
}
