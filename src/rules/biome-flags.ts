/**
 * M_REGISTRY.22 — per-BiomeType flag table.
 *
 * Before: 4 separate hand-rolled disjunctions
 * (`type === 'GRASS' || type === 'FOREST' || type === 'HIGHLAND'`)
 * scattered across `core/board.ts:194`, `core/balance-audit.ts:29`,
 * `world/terrain-mesh.ts:44`, plus the `ECONOMY.buildableBiomes`
 * array. Each was its own copy of "what kind of tile this is" and
 * each consumer's wording risked drifting from the others.
 *
 * After: ONE `BIOME_FLAGS` table answers every boolean question about
 * a biome type. Adding a new biome (e.g. 'SWAMP') is ONE row;
 * adding a new flag (e.g. `flammable`) is ONE column. Consumers read
 * named slots — the wording is the table's, not theirs.
 */
import type { BiomeType } from '@/core/biome';

/** Boolean capabilities per biome type. */
export interface BiomeFlags {
  /** Can a unit walk this tile? */
  walkable: boolean;
  /** Can a building be placed here? Buildable land only. */
  buildable: boolean;
  /** Counts toward "buildable-quality" reachability audits + decoration. */
  habitable: boolean;
  /** Should terrain-mesh lush-blend the surface? (grass + forest only) */
  lushBlend: boolean;
}

export const BIOME_FLAGS: Record<BiomeType, BiomeFlags> = {
  OCEAN: { walkable: false, buildable: false, habitable: false, lushBlend: false },
  LAKE: { walkable: false, buildable: false, habitable: false, lushBlend: false },
  BEACH: { walkable: true, buildable: true, habitable: false, lushBlend: false },
  DESERT: { walkable: true, buildable: false, habitable: false, lushBlend: false },
  GRASS: { walkable: true, buildable: true, habitable: true, lushBlend: true },
  FOREST: { walkable: true, buildable: false, habitable: true, lushBlend: true },
  HIGHLAND: { walkable: true, buildable: true, habitable: true, lushBlend: false },
  MOUNTAIN: { walkable: false, buildable: false, habitable: false, lushBlend: false },
};

/** Resolve the flag tuple for a biome type. */
export function biomeFlagsFor(type: BiomeType): BiomeFlags {
  return BIOME_FLAGS[type];
}
