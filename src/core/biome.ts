import { MAP_RADIUS, WORLD } from '@/config/world';
import type { Noise2D } from './noise';

const {
  heightThresholds,
  moistureCutoffDesert,
  moistureCutoffLake,
  noiseScale,
  islandAttenuationFactor,
  lakeModulo,
  lakeModuloThreshold,
} = WORLD.biome;

/**
 * A biome type. OCEAN and LAKE are water; SWAMP is shallow walkable
 * water that applies the disease status to standing units; the rest
 * are land. MOUNTAIN_PASS is HIGHLAND-elevation walkable terrain
 * inside a MOUNTAIN massif that acts as the fortifiable choke point
 * (per docs/specs/120-map-architecture.md M_FUN.MAP.PASS).
 */
export type BiomeType =
  | 'OCEAN'
  | 'LAKE'
  // M_FUN.MAP.UTILISATION.SHALLOWS — shallow water around landmasses.
  // Crossable ONLY by aquatic-skill units (Ferryman; future amphibious
  // roles) at high move cost. Deep OCEAN remains impassable. Allows
  // multi-island maps to feel connected without a free swim.
  | 'SHALLOWS'
  | 'SWAMP'
  | 'BEACH'
  | 'DESERT'
  | 'GRASS'
  | 'FOREST'
  | 'HIGHLAND'
  | 'MOUNTAIN_PASS'
  | 'MOUNTAIN'
  // M_FUN.DYN.VOLCANO — landmark + transient hazard biomes.
  // VOLCANO is the landmark; LAVA is the transient (paved by an
  // eruption for `lavaSeconds`, then reverts to MOUNTAIN_PASS).
  | 'VOLCANO'
  | 'LAVA'
  // M_FUN.ECON.QUICKSAND — rare BEACH 'swirl' hex. Walkable (you can
  // cross it on the way somewhere), but harvesting the amber deposit
  // there applies BOTH disease and fatigue. Two Discoveries
  // ('drain-bog' + 'plank-walkway') unlock safe harvest. Late-game
  // gating: a single quicksand hex is the only source of `amber`,
  // which gates Renaissance Hero/Wizard training + Wonder
  // completion.
  | 'QUICKSAND'
  // M_V6.CARRY.RUINS-BIOME — decorative biome assigned when a
  // barbarian camp is cleared. Walkable (acts like GRASS for
  // pathing/biome flags), gameplay-irrelevant. Reads as "old camp
  // remains" visually; lets the player see at a glance where
  // they've already cleared. Set at runtime by tickScoringPhase
  // when deathSystem flags a camp cleared; map-gen never produces
  // a RUINS tile (no noise threshold), so all biome-distribution
  // audits stay unchanged.
  | 'RUINS';

/** The assigned biome of one tile. */
export interface Biome {
  /** Integer elevation tier 0–6. */
  level: number;
  /** Biome type, derived from level + moisture. */
  type: BiomeType;
  /** Moisture value in [0, 1], retained for prop spawning. */
  moisture: number;
}

/**
 * A crossing-style family — groups biomes by how an elevation transition
 * across them looks and is traversed. See `docs/specs/99-passability-and-slopes.md`.
 * `water` biomes never host a crossing.
 */
export type CrossingStyle = 'stone' | 'mountain' | 'grass' | 'sand' | 'water';

/**
 * The crossing style for a biome — drives which natural/artificial crossing
 * meshes a cliff face of this biome renders:
 * - `stone`  — HIGHLAND: rockfall (natural) | carved stone stairs (artificial)
 * - `mountain` — MOUNTAIN: rock ramp | rough stone steps
 * - `grass`  — GRASS/FOREST: graded grassy hill | wooden plank-and-rope ramp
 * - `sand`   — BEACH/DESERT: sloped sand rise | wooden boardwalk
 * - `water`  — OCEAN/LAKE: never a crossing
 */
export function biomeStyleFor(type: BiomeType): CrossingStyle {
  switch (type) {
    case 'OCEAN':
    case 'LAKE':
    case 'SHALLOWS':
    case 'SWAMP':
      return 'water';
    case 'MOUNTAIN':
      return 'mountain';
    case 'MOUNTAIN_PASS':
    case 'HIGHLAND':
      return 'stone';
    case 'BEACH':
    case 'DESERT':
      return 'sand';
    default:
      return 'grass';
  }
}

/** Convert an elevation level + moisture to a biome type (no lake override). */
export function levelToType(level: number, moisture: number): BiomeType {
  if (level === 0) return 'OCEAN';
  if (level === 1) return 'BEACH';
  if (level === 2) return moisture < moistureCutoffDesert ? 'DESERT' : 'GRASS';
  if (level === 3) return moisture < moistureCutoffDesert ? 'DESERT' : 'FOREST';
  if (level === 4) return 'HIGHLAND';
  return 'MOUNTAIN';
}

/** Convert an island-attenuated raw height in [0, ~1] to an elevation tier. */
export function heightToLevel(rawHeight: number): number {
  if (rawHeight <= (heightThresholds[0] ?? 0.1)) return 0;
  if (rawHeight <= (heightThresholds[1] ?? 0.25)) return 1;
  if (rawHeight <= (heightThresholds[2] ?? 0.45)) return 2;
  if (rawHeight <= (heightThresholds[3] ?? 0.6)) return 3;
  if (rawHeight <= (heightThresholds[4] ?? 0.75)) return 4;
  if (rawHeight <= (heightThresholds[5] ?? 0.88)) return 5;
  return 6;
}

/**
 * Assign the biome of tile (q, r). `height` and `moisture` are noise fields
 * sampled at `(q*noiseScale, r*noiseScale)`. The height is attenuated by normalized
 * cube distance from the map centre to produce an island.
 *
 * `boardRadius` is the radius the caller is actually generating; the
 * island-attenuation curve is normalised by it so the same noise field
 * yields the same biome distribution regardless of board size. Prior
 * to PATTERN-I (M_FUN.QA.AIVAI.TUNE) this normalised by MAP_RADIUS
 * (a global constant) — boards smaller than the constant got too much
 * attenuation and ended up almost entirely water/sand, boards bigger
 * got too little. Default to MAP_RADIUS for legacy callers.
 */
export function assignBiome(
  q: number,
  r: number,
  height: Noise2D,
  moisture: Noise2D,
  boardRadius: number = MAP_RADIUS,
): Biome {
  // Coderabbit MAJOR PR #10 05:46Z — non-positive boardRadius would
  // make `dist` divide by zero / negative and collapse biome
  // assignment. Fail loudly at the call site so an upstream config
  // typo doesn't silently bake a bad map.
  if (boardRadius <= 0) {
    throw new Error(`assignBiome: boardRadius must be > 0, got ${boardRadius}`);
  }
  const s = -q - r;
  const nx = q * noiseScale;
  const nz = r * noiseScale;
  let rawHeight = height(nx, nz);
  const moist = moisture(nx + 100, nz + 100);
  const dist = Math.sqrt(q * q + r * r + s * s) / Math.sqrt(3) / boardRadius;
  rawHeight -= dist ** 2 * islandAttenuationFactor;

  const level = heightToLevel(rawHeight);
  let type = levelToType(level, moist);
  if (
    level >= 3 &&
    level <= 4 &&
    moist > moistureCutoffLake &&
    rawHeight > 0 &&
    rawHeight % lakeModulo < lakeModuloThreshold
  ) {
    type = 'LAKE';
  }
  return { level, type, moisture: moist };
}
