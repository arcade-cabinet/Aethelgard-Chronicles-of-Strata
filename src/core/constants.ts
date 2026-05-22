import worldConfigRaw from '@/config/world.json';

interface WorldConfig {
  hex: { hexRadius: number; tileHeight: number; waterLevelFactor: number };
  board: { mapRadius: number };
  mapSizes: { small: number; medium: number; large: number; huge: number };
  dayLength: number;
  weather: { minInterval: number; maxInterval: number };
  biome: {
    heightThresholds: number[];
    moistureCutoffDesert: number;
    moistureCutoffLake: number;
    noiseScale: number;
    islandAttenuationFactor: number;
    lakeModulo: number;
    lakeModuloThreshold: number;
  };
  noise: { octaves: number; persistence: number; lacunarity: number };
}

const worldConfig = worldConfigRaw as WorldConfig;

/** World-space radius of a single hex tile. */
export const HEX_RADIUS: number = worldConfig.hex.hexRadius;
/** Board is a circular region of this axial radius. */
export const MAP_RADIUS: number = worldConfig.board.mapRadius;
/** World-space height of one elevation tier. */
export const TILE_HEIGHT: number = worldConfig.hex.tileHeight;
/** Y position of the water plane. Level-0 tiles sit below it. */
export const WATER_LEVEL: number = worldConfig.hex.waterLevelFactor * TILE_HEIGHT;
/** The six axial neighbor directions, in clockwise order. */
export const HEX_DIRECTIONS: ReadonlyArray<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];
