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
  /**
   * Decoration scatter density (M_AUDIT2.ARCH.1) — fraction of eligible
   * tiles of this biome that receive a scattered prop. The per-biome
   * prop pools stay in Decoration.tsx (rules-of-hooks anchor 18 useGLTF
   * calls in fixed order); only the scalar density crosses the
   * boundary so other systems (M_REGISTRY future work) can read it.
   * `null` = no scatter on this biome (water, etc).
   */
  decorationDensity: number | null;
}

export const BIOME_FLAGS: Record<BiomeType, BiomeFlags> = {
  OCEAN: {
    walkable: false,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: 'water',
    peakLevel: null,
    decorationDensity: null,
  },
  LAKE: {
    walkable: false,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: 'water',
    peakLevel: null,
    decorationDensity: null,
  },
  // M_FUN.MAP.UTILISATION.SHALLOWS — base flags treat SHALLOWS as
  // impassable. Aquatic-skill units (Ferryman) will get an explicit
  // override via a future per-unit traversal table that lets them
  // path through SHALLOWS at higher move cost. Land units continue
  // to be blocked by it (same as OCEAN).
  SHALLOWS: {
    walkable: false,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: 'water',
    peakLevel: null,
    decorationDensity: null,
  },
  // M_FUN.MAP.SWAMP — walkable shallow-water biome. Units traversing
  // SWAMP gain a disease attribute that DoTs HP until they leave OR
  // a friendly Healer is in range. NOT buildable (foundations don't
  // hold in marshy ground), NOT habitable (no Houses/Farms).
  SWAMP: {
    walkable: true,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: 'water',
    peakLevel: null,
    decorationDensity: 0.4,
  },
  BEACH: {
    walkable: true,
    buildable: true,
    habitable: false,
    lushBlend: false,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: 0.18,
  },
  DESERT: {
    walkable: true,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: 'desert',
    peakLevel: null,
    decorationDensity: 0.22,
  },
  GRASS: {
    walkable: true,
    buildable: true,
    habitable: true,
    lushBlend: true,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: 0.32,
  },
  FOREST: {
    walkable: true,
    buildable: false,
    habitable: true,
    lushBlend: true,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: 0.55,
  },
  HIGHLAND: {
    walkable: true,
    buildable: true,
    habitable: true,
    lushBlend: false,
    cliffColor: null,
    peakLevel: 5,
    decorationDensity: 0.3,
  },
  // M_FUN.MAP.PASS — walkable HIGHLAND-elevation gap inside a
  // MOUNTAIN massif. Crosses the choke; applies a fatigue attribute
  // on traversal (-50% damage for 5 sec). Buildable (Wall +
  // Watchtower belong here — the fortifiable-choke contract).
  MOUNTAIN_PASS: {
    walkable: true,
    buildable: true,
    habitable: false,
    lushBlend: false,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: 0.15,
  },
  MOUNTAIN: {
    walkable: false,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: null,
    peakLevel: 5,
    decorationDensity: 0.35,
  },
  // M_FUN.DYN.VOLCANO — landmark. Impassable like MOUNTAIN but
  // visually distinct (peakLevel + custom material in render path).
  VOLCANO: {
    walkable: false,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: null,
    peakLevel: 5,
    decorationDensity: null,
  },
  // M_FUN.DYN.LAVA — transient eruption tile. Reviewer-fix: LAVA
  // is IMPASSABLE so A* will not route units through active lava.
  // The DoT damage still applies to units who were already on the
  // tile when it became lava (volcanoSystem handles their flight
  // via a one-shot evacuation when a tile flips under them).
  // Reverts to MOUNTAIN_PASS after `lavaSeconds`.
  LAVA: {
    walkable: false,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: null,
  },
  // M_FUN.ECON.QUICKSAND — walkable but unbuildable (you can't
  // stake a House in shifting sand). Not habitable so the desert-
  // blanket and similar habitable-only passes leave it alone.
  QUICKSAND: {
    walkable: true,
    buildable: false,
    habitable: false,
    lushBlend: false,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: null,
  },
  // M_V6.CARRY.RUINS-BIOME — set at runtime on cleared camp tiles. Walkable,
  // buildable, habitable — gameplay treats it like GRASS so a faction can
  // recover the territory. Visually distinct via the renderer (different
  // decoration set; "old camp" tile palette).
  RUINS: {
    walkable: true,
    buildable: true,
    habitable: true,
    lushBlend: false,
    cliffColor: null,
    peakLevel: null,
    decorationDensity: 0.2,
  },
};

/** Resolve the flag tuple for a biome type. */
export function biomeFlagsFor(type: BiomeType): BiomeFlags {
  return BIOME_FLAGS[type];
}
