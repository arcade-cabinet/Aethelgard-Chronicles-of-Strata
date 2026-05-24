/**
 * M_REGISTRY.11 — unified MOVER_PROFILES Thing registry.
 *
 * The third Thing-family registry (after BUILDING_PROFILES in
 * M_REGISTRY.5 and UNIT_PROFILES in M_REGISTRY.1). Mover entities carry
 * a `MoverBehavior` trait (`material: 'stone' | 'wood' | 'dirt'`); the
 * material drove a small per-material color table in
 * `src/world/Roads.tsx`. That's a Thing-shaped slot table — exactly
 * what the M_ARCH_UNIFY keystone says lives in a profile registry.
 *
 * One profile per mover material, named slots (color today; future
 * slots may include `passability`, `wearRate`, `audioFootstep` — each
 * lands as its own commit).
 */
import type { MoverMaterial } from '@/ecs/components';

/** Visual + (eventually) audio properties for one mover material. */
export interface MoverProfile {
  /** Render color of the mover disc — was Roads.tsx MATERIAL_COLOR. */
  color: string;
}

/** Per-MoverMaterial profile. Adding a new material is ONE row here. */
export const MOVER_PROFILES: Record<MoverMaterial, MoverProfile> = {
  stone: { color: '#94a3b8' },
  wood: { color: '#92400e' },
  dirt: { color: '#a16207' },
};

/** Resolve the full profile for a mover material. */
export function moverProfileFor(material: MoverMaterial): MoverProfile {
  return MOVER_PROFILES[material];
}
