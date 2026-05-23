/**
 * Rig + character-mesh accessors — thin Skin-slot reads (M_REGISTRY.2).
 *
 * Before this file's rewrite, `rigForRole` was a 1-line conditional on
 * role and `characterMeshId` was a 9-case switch. Both were parallel
 * to the per-role tables in `unit-profiles.ts` and the per-faction
 * tables in `skins.ts`. After M_REGISTRY.2 + M_REGISTRY.3, the
 * role → (rig tier + mesh logical id) map lives in
 * `SKINS[faction].rig[role]`. This file is the legacy-API shim: it
 * preserves the call-site contract used by AnimatedCharacter
 * (`rigForRole(role)`, `characterMeshId(role)`, `rigAnimationIds(tier)`)
 * but resolves every answer through the Skin slot.
 *
 * Today both factions share one rig map (SHARED_RIG_TODAY in skins.ts),
 * so a role-only lookup is unambiguous — picking SKINS.player.rig as
 * the default returns the same row SKINS.enemy.rig would. When a third
 * tribe introduces per-faction rig divergence, AnimatedCharacter will
 * need to accept a `faction` prop and pass it through; this accessor
 * will gain a faction parameter at the same time. Both are M_REGISTRY.2
 * follow-up.
 */
import type { UnitType } from '@/ecs/components';
import { SKINS, type RigTier } from '@/rules/skins';

export type { RigTier };

/** The rig tier for a unit role — read off the Skin slot. */
export function rigForRole(role: UnitType): RigTier {
  return SKINS.player.rig[role].tier;
}

/** The two manifest ids of the animation-library GLBs for a rig tier. */
export function rigAnimationIds(tier: RigTier): { movement: string; general: string } {
  return {
    movement: `characters.rigs.${tier}-movement`,
    general: `characters.rigs.${tier}-general`,
  };
}

/**
 * The manifest id of the character mesh GLB for a unit role. Read off
 * the Skin slot; current 2-tribe roster shares one mesh map across
 * factions (see SHARED_RIG_TODAY in src/rules/skins.ts).
 */
export function characterMeshId(role: UnitType): string {
  return SKINS.player.rig[role].meshLogicalId;
}
