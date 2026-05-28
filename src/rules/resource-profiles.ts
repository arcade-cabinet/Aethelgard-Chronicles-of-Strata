/**
 * M_AUDIT2.ARCH.4 — unified RESOURCE_PROFILES Thing registry.
 *
 * User PR #10 05:46Z architectural pivot — "aren't resource profiles
 * an anti-pattern that should be expressed in JSON?". RESOURCE_PROFILES
 * is now DERIVED from `src/config/resources.json` (the JSON-first
 * registry), not hand-coded TS. Each resources.json row carries:
 *
 *   - `mesh.logicalId` (+ optional `mesh.tint`) — visual identity
 *   - `topupAmount` — starting amount for attractor-topup nodes
 *   - `sources[].biomes` — biomes the node may spawn in (collapsed
 *     across all source rows for the spawn-pass + attractor union)
 *
 * Adding a new harvestable resource is now ONE row in resources.json
 * + harvestYield entry in economy.json. No TS edit required (this
 * file is purely an accessor).
 *
 * Collapsed from:
 *   - `src/world/ResourceNodes.tsx` NODE_MESH + NODE_TINT (visual)
 *   - `src/config/economy.ts` ECONOMY.harvestYield (gameplay)
 *   - the prior hand-coded RESOURCE_PROFILES table
 */
import { harvestYieldFor } from '@/config/economy';
import { RESOURCES } from '@/config/economy';
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
 * Build the runtime registry by walking resources.json. Each source
 * row's `biomes` set is unioned for the spawn-pass biome filter; mesh
 * + topupAmount come from the new JSON fields; harvestYield bridges
 * to economy.json (the per-harvest tune lives there). Resources
 * without a `mesh` block (none expected post-migration) get a safe
 * fallback so an early-build crash doesn't fire.
 */
function buildRegistry(): Record<ResourceType, ResourceProfile> {
  const out = {} as Record<ResourceType, ResourceProfile>;
  for (const r of RESOURCES) {
    const id = r.id as ResourceType;
    const biomes = new Set<string>();
    for (const s of r.sources) {
      // `biome-node` sources carry `biomes`; other source kinds
      // (e.g. building-produced 'mana') don't world-spawn — leave
      // the set empty.
      if (s.kind === 'biome-node' && Array.isArray(s.biomes)) {
        for (const b of s.biomes) biomes.add(b);
      }
    }
    out[id] = {
      meshLogicalId: r.mesh?.logicalId ?? 'nature.rock.large-a',
      ...(r.mesh?.tint ? { meshTint: r.mesh.tint } : {}),
      harvestYield: harvestYieldFor(id),
      biomes,
      topupAmount: r.topupAmount ?? 0,
    };
  }
  return out;
}

/**
 * The master registry — derived once at module load from resources.json
 * + economy.json. Read via `resourceProfileFor` everywhere.
 */
export const RESOURCE_PROFILES: Record<ResourceType, ResourceProfile> = buildRegistry();

export function resourceProfileFor(type: ResourceType): ResourceProfile {
  return RESOURCE_PROFILES[type];
}
