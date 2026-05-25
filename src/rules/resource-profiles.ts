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
    biomes: new Set(['HIGHLAND']),
    topupAmount: 80,
  },
  // M_FUN.ECON.JSON-RESOURCES — ore is the MOUNTAIN-only variant
  // (split from the old combined stone-on-HIGHLAND-and-MOUNTAIN).
  // Higher per-node yield but harvesting it applies fatigue per
  // resources.json#ore.sources[0].risks.
  ore: {
    meshLogicalId: 'nature.rock.crystal-large',
    meshTint: '#475569',
    harvestYield: harvestYieldFor('stone') * 1.2,
    biomes: new Set(['MOUNTAIN']),
    topupAmount: 60,
  },
  gold: {
    meshLogicalId: 'nature.rock.large-a',
    meshTint: '#fbbf24', // gold veins glow gold
    harvestYield: harvestYieldFor('gold'),
    biomes: new Set(['GRASS']),
    topupAmount: 60,
  },
  food: {
    // Food has three biome variants (FOREST game / SHALLOWS fish /
    // GRASS forage) per resources.json#food.sources — the SCATTER
    // path keys off the source biome to pick the overlay style. The
    // shared meshLogicalId is the in-world marker; ResourceNodes.tsx
    // upgrades it per biome on render (M_FUN.ECON.NODE-VARIANTS).
    meshLogicalId: 'nature.tree.pine-a',
    biomes: new Set(['FOREST', 'SHALLOWS', 'GRASS']),
    harvestYield: 8,
    topupAmount: 80,
  },
  peat: {
    // Swamp-bog cut. Risk-bearing per resources.json#peat (disease
    // DoT; mitigated by 'peat-mask' Discovery).
    meshLogicalId: 'nature.rock.large-a',
    meshTint: '#78350f',
    biomes: new Set(['SWAMP']),
    harvestYield: 10,
    topupAmount: 70,
  },
  science: {
    // Science nodes are never spawned in the world today; the mesh
    // is a placeholder so a future scatter rule doesn't crash.
    meshLogicalId: 'nature.rock.large-a',
    harvestYield: harvestYieldFor('science'),
    biomes: new Set(),
    topupAmount: 0,
  },
  // M_EXPANSION.F.72 — mana is research-tier today (no world
  // spawn); the mesh is a placeholder so a future mana-crystal
  // scatter pass doesn't crash. The crystal-large mesh is the
  // closest visual fit when that lands.
  mana: {
    meshLogicalId: 'nature.rock.crystal-large',
    harvestYield: harvestYieldFor('mana'),
    biomes: new Set(),
    topupAmount: 0,
  },
};

export function resourceProfileFor(type: ResourceType): ResourceProfile {
  return RESOURCE_PROFILES[type];
}
