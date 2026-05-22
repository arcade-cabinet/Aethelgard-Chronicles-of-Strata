import { WORLD } from '@/config/world';

/** World-space radius of a single hex tile. */
export const HEX_RADIUS: number = WORLD.hex.hexRadius;
/** Board is a circular region of this axial radius. */
export const MAP_RADIUS: number = WORLD.board.mapRadius;
/** World-space height of one elevation tier. */
export const TILE_HEIGHT: number = WORLD.hex.tileHeight;
/** Y position of the water plane. Level-0 tiles sit below it. */
export const WATER_LEVEL: number = WORLD.hex.waterLevelFactor * TILE_HEIGHT;
/** The six axial neighbor directions, in clockwise order. */
export const HEX_DIRECTIONS: ReadonlyArray<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];
