import worldJson from './world.json';

/**
 * Typed accessor for `world.json` — board, hex, weather, day-night, biome, and
 * noise tuning. The JSON is imported and asserted to this shape exactly once,
 * here, at the module boundary; every consumer imports the typed `WORLD` object
 * and gets full type-checking with no per-site casts.
 */
export interface WorldConfig {
  /** Hex-tile geometry. */
  hex: {
    /** World-space radius of one hex tile. */
    hexRadius: number;
    /** World-space height of one elevation tier. */
    tileHeight: number;
    /** Water-plane height as a fraction of `tileHeight`. */
    waterLevelFactor: number;
  };
  /** Board generation. */
  board: {
    /** Default board radius in hex tiles. */
    mapRadius: number;
  };
  /** Selectable map-size radii. */
  mapSizes: {
    /** Small board radius. */
    small: number;
    /** Medium board radius (the default). */
    medium: number;
    /** Large board radius. */
    large: number;
    /** Huge board radius (device-gated). */
    huge: number;
  };
  /** Seconds in one full day/night cycle. */
  dayLength: number;
  /** Weather transition timing. */
  weather: {
    /** Minimum seconds between weather transitions. */
    minInterval: number;
    /** Maximum seconds between weather transitions. */
    maxInterval: number;
  };
  /** Biome-assignment tuning. */
  biome: {
    /** Six ascending raw-height cutoffs separating the seven elevation tiers. */
    heightThresholds: number[];
    /** Moisture below this is DESERT, above is GRASS/FOREST. */
    moistureCutoffDesert: number;
    /** Moisture above this can become LAKE. */
    moistureCutoffLake: number;
    /** Spatial frequency of the height/moisture noise sample. */
    noiseScale: number;
    /** Island-falloff exponent strength. */
    islandAttenuationFactor: number;
    /** Lake-carving raw-height modulo period. */
    lakeModulo: number;
    /** Lake-carving modulo threshold. */
    lakeModuloThreshold: number;
  };
  /** Fractal-noise (FBM) parameters. */
  noise: {
    /** Number of FBM octaves. */
    octaves: number;
    /** Amplitude falloff per octave. */
    persistence: number;
    /** Frequency growth per octave. */
    lacunarity: number;
  };
}

/** The validated, frozen world tuning. Import this — never `world.json` directly. */
export const WORLD: WorldConfig = worldJson;
