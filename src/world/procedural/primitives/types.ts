/**
 * M_V11.PROCMESH.PRIMITIVES — shared types for tier-1 structural
 * primitives. Every primitive accepts a `material?: PrimitiveMaterial`
 * prop and is FACTION-AGNOSTIC. SKINS swaps materials globally per
 * faction at the building level; primitives never know.
 *
 * The material families enumerated here are the surfaces that SKINS
 * overrides per faction (M_V11.PROCMESH.MATERIALS).
 */

import type * as THREE from 'three';

/** A material spec consumable by meshStandardMaterial.
 *  Kept narrow (only the props we actually flip per-skin); add as needed.
 */
export interface PrimitiveMaterial {
  color?: THREE.ColorRepresentation;
  metalness?: number;
  roughness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

/** The named material families a faction Skin can override. Primitives
 *  consume material objects directly — they never look up by family.
 *  The family map exists at the BUILDING composer layer (uses context
 *  to pick `materials.stone` / `materials.wood` / etc.) so primitives
 *  stay coupling-free.
 */
export type PrimitiveFamily =
  | 'stone' // plinths, bricks, foundation
  | 'wood' // logs, posts, planks, beams
  | 'roof' // pitched + cone roofs
  | 'banner' // faction-colored fabric
  | 'trim' // gold-tone bands, ornament
  | 'accent' // secondary ornament (silver, bronze)
  | 'glass' // window glow, emissive
  | 'metal' // weapons, shield faces, finials
  | 'dark'; // shadowed crevices, void slits

/** Default material set used by primitive harness baselines and as
 *  fallbacks when a building doesn't supply a material override.
 *  Tuned to read as "rough stone-and-timber" neutral so primitive
 *  baselines aren't faction-biased.
 */
export const DEFAULT_MATERIALS: Record<PrimitiveFamily, PrimitiveMaterial> = {
  stone: { color: '#9ca3af', roughness: 0.92, metalness: 0.05 },
  wood: { color: '#92400e', roughness: 0.88, metalness: 0 },
  roof: { color: '#7c2d12', roughness: 0.85, metalness: 0 },
  banner: { color: '#dc2626', roughness: 0.55, metalness: 0 },
  trim: { color: '#fbbf24', roughness: 0.3, metalness: 0.8 },
  accent: { color: '#cbd5e1', roughness: 0.45, metalness: 0.55 },
  glass: { color: '#fef3c7', emissive: '#fef3c7', emissiveIntensity: 0.6, roughness: 0.2 },
  metal: { color: '#d1d5db', roughness: 0.35, metalness: 0.85 },
  dark: { color: '#1f2937', roughness: 0.95, metalness: 0 },
};
