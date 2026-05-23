/**
 * M_AUDIT2.ARCH.4 — unified RESOURCE_PROFILES Thing registry.
 *
 * Per-ResourceType Thing-shaped data — mesh + tint + harvest yield —
 * collapsed from three separate places:
 *
 *   - `src/world/ResourceNodes.tsx` NODE_MESH + NODE_TINT (visual)
 *   - `src/config/economy.ts` ECONOMY.harvestYield (gameplay)
 *
 * One profile per resource; consumers read via `resourceProfileFor`.
 *
 * Adding a new harvestable resource (gems, mana) is ONE row here +
 * ONE entry in RESOURCE_TYPES + extending the per-resource HUD bits
 * already covered by `RESOURCE_DISPLAY` (M_AUDIT2.ARCH.2).
 */
import { harvestYieldFor } from '@/config/economy';
import type { ResourceType } from '@/ecs/components';

export interface ResourceProfile {
  /** Logical asset id of the world-mesh that represents the node. */
  meshLogicalId: string;
  /** Optional tint applied to the mesh (e.g. gold veins glow gold). */
  meshTint?: string;
  /** Resource yielded per harvest cycle. */
  harvestYield: number;
  /**
   * M_EXPANSION.S.52 — biomes a node of this type may spawn in.
   * Used by BOTH the world-spread spawn pass + the attractor top-up
   * (the two paths used to maintain separate ALLOWED_BIOMES tables).
   * Empty set = never world-spawned (science today).
   */
  biomes: ReadonlySet<string>;
  /**
   * M_EXPANSION.S.52 — starting amount for an attractor top-up node
   * (the guaranteed-near-base spawn). Separate from harvestYield (per-
   * harvest yield) and the world-spread initial amount in
   * config/economy.json.
   */
  topupAmount: number;
}

/**
 * The master registry. Science is included for completeness even
 * though science nodes are never spawned in the world (the value
 * accrues via Library + passive trickle); meshLogicalId is the rock
 * placeholder so a future "science crystal" doesn't crash if added.
 */
export const RESOURCE_PROFILES: Record<ResourceType, ResourceProfile> = {
  wood: {
    meshLogicalId: 'nature.tree.pine-a',
    harvestYield: harvestYieldFor('wood'),
    biomes: new Set(['FOREST', 'GRASS']),
    topupAmount: 100,
  },
  stone: {
    meshLogicalId: 'nature.rock.large-a',
    harvestYield: harvestYieldFor('stone'),
    biomes: new Set(['HIGHLAND', 'MOUNTAIN']),
    topupAmount: 80,
  },
  gold: {
    meshLogicalId: 'nature.rock.large-a',
    meshTint: '#fbbf24', // gold veins glow gold
    harvestYield: harvestYieldFor('gold'),
    biomes: new Set(['GRASS', 'HIGHLAND']),
    topupAmount: 60,
  },
  science: {
    // Science nodes are never spawned in the world today; the mesh
    // is a placeholder so a future scatter rule doesn't crash.
    meshLogicalId: 'nature.rock.large-a',
    harvestYield: harvestYieldFor('science'),
    biomes: new Set(),
    topupAmount: 0,
  },
};

export function resourceProfileFor(type: ResourceType): ResourceProfile {
  return RESOURCE_PROFILES[type];
}
