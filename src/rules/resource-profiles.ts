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
  },
  stone: {
    meshLogicalId: 'nature.rock.large-a',
    harvestYield: harvestYieldFor('stone'),
  },
  gold: {
    meshLogicalId: 'nature.rock.large-a',
    meshTint: '#fbbf24', // gold veins glow gold
    harvestYield: harvestYieldFor('gold'),
  },
  science: {
    // Science nodes are never spawned in the world today; the mesh
    // is a placeholder so a future scatter rule doesn't crash.
    meshLogicalId: 'nature.rock.large-a',
    harvestYield: harvestYieldFor('science'),
  },
};

export function resourceProfileFor(type: ResourceType): ResourceProfile {
  return RESOURCE_PROFILES[type];
}
