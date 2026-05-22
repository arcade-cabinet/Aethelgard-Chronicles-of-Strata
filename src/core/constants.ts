/** World-space radius of a single hex tile. */
export const HEX_RADIUS = 1;
/** Board is a circular region of this axial radius. */
export const MAP_RADIUS = 20;
/** World-space height of one elevation tier. */
export const TILE_HEIGHT = 0.85;
/** Y position of the water plane. Level-0 tiles sit below it. */
export const WATER_LEVEL = 0.5 * TILE_HEIGHT;
/** The six axial neighbor directions, in clockwise order. */
export const HEX_DIRECTIONS: ReadonlyArray<{ q: number; r: number }> = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];
