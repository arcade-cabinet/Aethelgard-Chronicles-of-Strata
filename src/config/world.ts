import worldJson from './world.json';

/** One axial neighbour direction. */
export interface AxialDir {
  /** Axial q offset. */
  q: number;
  /** Axial r offset. */
  r: number;
}

/** Camera placement for one viewport class. */
export interface CameraProfileConfig {
  /** Default camera distance from its target. */
  distance: number;
  /** Vertical field of view, degrees. */
  fov: number;
  /** Downward pitch in radians (0 = horizon, π/2 = straight down). */
  pitch: number;
}

/**
 * Typed accessor for `world.json` — every scene-scale, terrain, weather,
 * day-night, biome, noise, and camera value. There is no `core/constants`:
 * every number, including the six axial directions, is configuration loaded
 * here once. See `docs/specs/98-viewport-and-config.md`.
 */
export interface WorldConfig {
  /** Hex-tile geometry. */
  hex: {
    /** World-space radius of one hex tile. */
    hexRadius: number;
    /** World-space height of one elevation tier. */
    tileHeight: number;
    /** Water-surface height as a fraction of `tileHeight`. */
    waterLevelFactor: number;
    /** Vertical thickness of the water disc. */
    waterDiscHeight: number;
    /** The six axial neighbour directions, clockwise. */
    directions: AxialDir[];
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
  /**
   * Simulation tick parameters (M_AUDIT2.ARCH.14). Determinism-
   * critical: fixed timestep + cap on substeps per render frame.
   */
  sim: {
    fixedDt: number;
    maxStepsPerFrame: number;
  };
  /** Unit vision tuning (M_AUDIT2.ARCH.15). */
  vision: {
    /** Base radius (tiles) of a unit's vision cone. */
    baseUnitRadius: number;
    /** Half-angle of the cone in radians (~70° total → 1.225 rad). */
    unitConeHalfAngle: number;
  };
  /** Crossing render tuning (M_AUDIT2.ARCH.17). */
  crossings: {
    halfWidth: number;
    lift: number;
    stairSteps: number;
  };
  /** Floating-text popups (CombatText, ResourceText) — M_AUDIT2.ARCH.18. */
  floatingText: {
    popupLifetime: number;
    popupDrift: number;
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
  /** Camera zoom bounds and per-viewport-class defaults. */
  camera: {
    /** Closest the camera may zoom. */
    minZoom: number;
    /** Farthest the camera may zoom. */
    maxZoom: number;
    /** Desktop / landscape-tablet camera defaults. */
    desktop: CameraProfileConfig;
    /** M_EXPANSION.S.63 — ultra-wide (>2.4:1) camera defaults. */
    ultraWide: CameraProfileConfig;
    /** Phone-landscape camera defaults. */
    phoneLandscape: CameraProfileConfig;
    /** Phone-portrait camera defaults. */
    phonePortrait: CameraProfileConfig;
  };
}

/** The validated world config. Import this — never `world.json` directly. */
export const WORLD: WorldConfig = worldJson;

// --- Derived scene-scale values (formerly src/core/constants.ts) ---

/** World-space radius of one hex tile. */
export const HEX_RADIUS: number = WORLD.hex.hexRadius;

/** World-space height of one elevation tier. */
export const TILE_HEIGHT: number = WORLD.hex.tileHeight;

/** Default board radius in hex tiles. */
export const MAP_RADIUS: number = WORLD.board.mapRadius;

/** Y of the water surface — level-0 ocean tiles sit at or below it. */
export const WATER_LEVEL: number = WORLD.hex.waterLevelFactor * TILE_HEIGHT;

/** The six axial neighbour directions, clockwise. */
export const HEX_DIRECTIONS: ReadonlyArray<AxialDir> = WORLD.hex.directions;
