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
  /**
   * Cliff (vertical-face) color hint per biome — fixed earth/rock tone
   * (M_REGISTRY.21). `null` means defer to elevation-based fallback
   * (rock at level≥4, dirt otherwise). LAKE picks 'water'; DESERT picks
   * 'desert'.
   */
  cliffColor: 'water' | 'desert' | null;
  /**
   * Mountain peak placement threshold (M_REGISTRY.10). When a tile has
   * `level >= peakLevel`, Mountains.tsx draws a peak cone on it. `null`
   * means no peaks on this biome regardless of elevation. Reading the
   * threshold off the biome flag instead of a hardcoded `>= 5` lets a
   * future tribe / map type opt biomes in/out without code edits.
   */
  peakLevel: number | null;
}

export const BIOME_FLAGS: Record<BiomeType, BiomeFlags> = {
  OCEAN: { walkable: false, buildable: false, habitable: false, lushBlend: false, cliffColor: 'water', peakLevel: null },
  LAKE: { walkable: false, buildable: false, habitable: false, lushBlend: false, cliffColor: 'water', peakLevel: null },
  BEACH: { walkable: true, buildable: true, habitable: false, lushBlend: false, cliffColor: null, peakLevel: null },
  DESERT: { walkable: true, buildable: false, habitable: false, lushBlend: false, cliffColor: 'desert', peakLevel: null },
  GRASS: { walkable: true, buildable: true, habitable: true, lushBlend: true, cliffColor: null, peakLevel: null },
  FOREST: { walkable: true, buildable: false, habitable: true, lushBlend: true, cliffColor: null, peakLevel: null },
  HIGHLAND: { walkable: true, buildable: true, habitable: true, lushBlend: false, cliffColor: null, peakLevel: 5 },
  MOUNTAIN: { walkable: false, buildable: false, habitable: false, lushBlend: false, cliffColor: null, peakLevel: 5 },
};

/** Resolve the flag tuple for a biome type. */
export function biomeFlagsFor(type: BiomeType): BiomeFlags {
  return BIOME_FLAGS[type];
}
