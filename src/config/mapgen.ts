import { z } from 'zod';
import type { BiomeType } from '@/core/biome';
import mapgenJson from './mapgen.json';

/**
 * M_FUN.ARCH.CONFIG — Zod-validated typed accessor for `mapgen.json`.
 *
 * Every per-biome and per-mapType generation + behaviour value lives
 * in the JSON; this module narrows it to typed shapes via Zod schema
 * with proper runtime validation (not hand-rolled type guards).
 *
 * Adding a new biome OR mapType = add one row to mapgen.json + one
 * harness test (M_FUN.ARCH.HARNESS). NO hardcoded if/then ladders
 * in src/core/board.ts or src/rules/biome-flags.ts going forward.
 */

const BIOME_TYPES = [
  'OCEAN',
  'LAKE',
  'SHALLOWS',
  'SWAMP',
  'BEACH',
  'DESERT',
  'GRASS',
  'FOREST',
  'HIGHLAND',
  'MOUNTAIN_PASS',
  'MOUNTAIN',
  'VOLCANO',
  'LAVA',
  'QUICKSAND',
] as const satisfies readonly BiomeType[];

const BiomeTypeSchema = z.enum(BIOME_TYPES);

const BiomeAttributeSchema = z.enum(['disease', 'fatigue', 'dehydration']).nullable();
export type BiomeAttribute = z.infer<typeof BiomeAttributeSchema>;

const BiomeRuleSchema = z.object({
  /** Integer elevation tier 0–5 (matches Biome.level). */
  elevation: z.number().int().min(0).max(5),
  walkable: z.boolean(),
  buildable: z.boolean(),
  habitable: z.boolean(),
  /** A* move-cost multiplier (1.0 = baseline GRASS). */
  moveCost: z.number().positive(),
  /** Status attribute applied on traversal. */
  appliesAttribute: BiomeAttributeSchema,
  /** 0 = no attribute / baseline; 1.0 = baseline tick rate. */
  attributeStrength: z.number().min(0),
});
export type BiomeRule = z.infer<typeof BiomeRuleSchema>;

const MapTypeRuleSchema = z.object({
  mountainIntensity: z.number().min(0).max(1),
  channels: z.boolean(),
  hydrology: z.enum(['inlandLake', 'desertBlanket', 'multiIsland']),
});
export type MapTypeRule = z.infer<typeof MapTypeRuleSchema>;

const VolcanoTuningSchema = z.object({
  /** Per-board chance one volcano landmark is placed. */
  placementChance: z.number().min(0).max(1),
  /** Wall-clock seconds between eruptions. */
  eruptionIntervalSeconds: z.number().positive(),
  /** Seconds a LAVA tile stays lava before reverting. */
  lavaSeconds: z.number().positive(),
  /** Seconds GRASS tiles in fertileRadius gain a bonus. */
  fertileSeconds: z.number().positive(),
  /** Hex radius from the volcano that gains the fertile-soil bonus. */
  fertileRadius: z.number().int().positive(),
  /** HP/sec continuous DoT for units stranded on a LAVA tile (scaled by dt). */
  damagePerSecond: z.number().nonnegative(),
});
export type VolcanoTuning = z.infer<typeof VolcanoTuningSchema>;

const QuakeTuningSchema = z.object({
  /** Hex radius from the epicentre that may flip. */
  clusterRadius: z.number().int().positive(),
  /** Max number of tiles flipped per event. */
  maxFlips: z.number().int().positive(),
  /** HUD camera-shake duration in seconds. */
  shakeSeconds: z.number().nonnegative(),
  /** Chance an event-PRNG quake event actually shakes the ground. */
  ignitionChancePerEvent: z.number().min(0).max(1),
});
export type QuakeTuning = z.infer<typeof QuakeTuningSchema>;

const WildfireTuningSchema = z.object({
  /** Spread-tick cadence in seconds. */
  tickSeconds: z.number().positive(),
  /** Per-tick chance each burning tile ignites each FOREST neighbour. */
  spreadChance: z.number().min(0).max(1),
  /** How many ticks a single ignited tile burns before extinguishing. */
  burnTicks: z.number().int().positive(),
  /** Flat HP damage per spread-tick to a unit standing on a burning tile. */
  damagePerTick: z.number().nonnegative(),
  /** Chance an event-PRNG wildfire event picks a FOREST tile to ignite. */
  ignitionChancePerEvent: z.number().min(0).max(1),
  /** Cap on concurrent burning tiles — bounds worst-case main-thread cost. */
  maxConcurrent: z.number().int().positive(),
});
export type WildfireTuning = z.infer<typeof WildfireTuningSchema>;

const MountainTuningSchema = z.object({
  noiseFreq: z.number().positive(),
  noiseWeight: z.number().min(0).max(1),
  centerBiasWeight: z.number().min(0).max(1),
  intensityScale: z.number().min(0).max(1),
  safetyRing: z.number().int().nonnegative(),
  isthmusThreshold: z.number().int().min(0).max(6),
});
export type MountainTuning = z.infer<typeof MountainTuningSchema>;

const MapgenConfigSchema = z
  .object({
    /** Every BiomeType MUST have a row (full registry, not partial). */
    biomes: z.record(BiomeTypeSchema, BiomeRuleSchema),
    mountain: MountainTuningSchema,
    wildfire: WildfireTuningSchema,
    quake: QuakeTuningSchema,
    volcano: VolcanoTuningSchema,
    mapTypes: z.record(z.string(), MapTypeRuleSchema),
  })
  .refine((cfg) => BIOME_TYPES.every((b) => b in cfg.biomes), {
    message: `mapgen.json missing one or more required biome rows (${BIOME_TYPES.join(', ')})`,
  });
type MapgenConfig = z.infer<typeof MapgenConfigSchema>;

// Strip $comment keys before validation. They're JSON-file documentation
// only and never reach runtime types.
function stripComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return input;
}

// Validate at module load. Throws a structured Zod error if the
// JSON drifts from the schema. CI catches the regression on the
// first test that imports this module.
const validated: MapgenConfig = MapgenConfigSchema.parse(stripComments(mapgenJson));

/** Resolve a biome rule. Throws if the biome isn't in the registry. */
export function biomeRule(type: BiomeType): BiomeRule {
  const row = validated.biomes[type];
  if (!row) throw new Error(`mapgen.json: no rule for biome ${type}`);
  return row;
}

/** Resolve a mapType rule. Returns null if mapType isn't registered. */
export function mapTypeRule(type: string): MapTypeRule | null {
  return validated.mapTypes[type] ?? null;
}

/** Mountain noise tuning constants. */
export const MOUNTAIN_TUNING: MountainTuning = validated.mountain;

/** Wildfire dynamic-terrain tuning constants. */
export const WILDFIRE_TUNING: WildfireTuning = validated.wildfire;

/** Earthquake dynamic-terrain tuning constants. */
export const QUAKE_TUNING: QuakeTuning = validated.quake;

/** Volcano dynamic-terrain tuning constants. */
export const VOLCANO_TUNING: VolcanoTuning = validated.volcano;

/** All biomes, for harness / test enumeration. */
export const ALL_BIOMES: ReadonlyArray<BiomeType> = BIOME_TYPES;
