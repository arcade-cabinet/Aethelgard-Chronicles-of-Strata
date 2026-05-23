import type { UnitType } from '@/ecs/components';

/** The two KayKit skeleton tiers. Characters share a rig within a tier. */
export type RigTier = 'medium' | 'large';

/** The rig tier for a unit role. */
export function rigForRole(role: UnitType): RigTier {
  return role === 'Orc' || role === 'BlackKnight' ? 'large' : 'medium';
}

/** The two manifest ids of the animation-library GLBs for a rig tier. */
export function rigAnimationIds(tier: RigTier): { movement: string; general: string } {
  return {
    movement: `characters.rigs.${tier}-movement`,
    general: `characters.rigs.${tier}-general`,
  };
}

/**
 * The manifest id of the character mesh GLB for a unit role. Peon and Footman
 * both draw from the hero roster; enemies draw from the enemy roster.
 */
export function characterMeshId(role: UnitType): string {
  switch (role) {
    case 'Peon':
      return 'characters.heroes.engineer';
    case 'Footman':
      return 'characters.heroes.knight';
    case 'Trebuchet':
      // No dedicated trebuchet mesh — reuse the knight scaled to feel siege-y.
      // The siege identity comes from damageType + range; the mesh is a
      // placeholder until a dedicated KayKit siege model lands.
      return 'characters.heroes.knight';
    case 'Goblin':
      // The KayKit bundle has no dedicated goblin mesh; the hooded Rogue is the
      // closest small humanoid. Goblins are tinted/scaled distinctly at render
      // time so they still read as a separate enemy faction.
      return 'characters.heroes.rogue';
    case 'Orc':
      return 'characters.enemies.orc';
    case 'Vampire':
      return 'characters.enemies.vampire';
    case 'BlackKnight':
      return 'characters.enemies.black-knight';
    case 'Witch':
      return 'characters.enemies.witch';
    default: {
      // Exhaustiveness guard — TS catches missing variants at compile time.
      const _exhaustive: never = role;
      throw new Error(`characterMeshId: unhandled UnitType ${_exhaustive}`);
    }
  }
}
