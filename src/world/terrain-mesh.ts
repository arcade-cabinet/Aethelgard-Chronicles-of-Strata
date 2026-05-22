import type { BoardData, Tile } from '@/core/board';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexCorner, getHexKey } from '@/core/hex';
import { Color } from 'three';
import { BIOME_COLORS } from './palette';

/** The raw vertex arrays for the merged terrain mesh. */
export interface TerrainGeometryData {
  /** Flat XYZ triplets — three per triangle vertex. */
  positions: Float32Array;
  /** Flat RGB triplets — one per position vertex, all in [0, 1]. */
  colors: Float32Array;
}

/** Six axial neighbor directions, matching `getHexCorner`'s winding. */
const NEIGHBOR_DIRS = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
];

/** Snow-cap tint blended onto the highest peaks. */
const SNOW = new Color('#f8fafc');
/** Lush-green tint a grass/forest tile lerps toward by its moisture. */
const LUSH = new Color('#22c55e');

/**
 * Surface (top-face) color for a tile — the flat biome color, brightened toward
 * lush green on moist grass/forest tiles and toward snow-white on level-6
 * peaks. Mirrors poc1's `getSurfaceColor`.
 */
function surfaceColor(tile: Tile): Color {
  const c = new Color(BIOME_COLORS[tile.type]);
  if (tile.type === 'GRASS' || tile.type === 'FOREST') {
    c.lerp(LUSH, tile.moisture);
  }
  if (tile.level >= 6) {
    c.lerp(SNOW, 0.8);
  }
  return c;
}

/**
 * Cliff (vertical-face) color where a tile drops to a lower neighbor — the mean
 * of the two tiles' biome colors, darkened slightly so cliffs read as shadowed
 * rock. Mirrors poc1's `getCliffColor`.
 */
function cliffColor(top: Tile, bottom: Tile | undefined): Color {
  const a = new Color(BIOME_COLORS[top.type]);
  const b = bottom ? new Color(BIOME_COLORS[bottom.type]) : a.clone();
  return a.lerp(b, 0.5).multiplyScalar(0.78);
}

/**
 * Build the whole board as one merged terrain geometry: for every tile, a
 * 6-triangle top fan plus a cliff quad on each edge that faces a lower (or
 * off-board) neighbor. Per-vertex colors carry the biome + surface variation.
 * One mesh, one draw call — replaces the per-tile prism approach.
 */
export function buildTerrainGeometry(board: BoardData): TerrainGeometryData {
  const positions: number[] = [];
  const colors: number[] = [];
  const push = (x: number, y: number, z: number, c: Color) => {
    positions.push(x, y, z);
    colors.push(c.r, c.g, c.b);
  };

  for (const tile of board.tiles.values()) {
    const center = axialToWorld(tile.q, tile.r);
    const topY = tile.level * TILE_HEIGHT;
    const surf = surfaceColor(tile);

    for (let i = 0; i < 6; i++) {
      const p1 = getHexCorner(center.x, center.z, i);
      const p2 = getHexCorner(center.x, center.z, (i + 1) % 6);

      // top-face triangle (center → corner → next corner)
      push(center.x, topY, center.z, surf);
      push(p1.x, topY, p1.z, surf);
      push(p2.x, topY, p2.z, surf);

      // cliff face on this edge if the neighbor is lower or off-board
      const dir = NEIGHBOR_DIRS[i];
      if (!dir) continue;
      const neighbor = board.tiles.get(getHexKey(tile.q + dir.q, tile.r + dir.r));
      const neighborY =
        neighbor && neighbor.level > 0 ? neighbor.level * TILE_HEIGHT : -TILE_HEIGHT * 1.5;
      if (neighborY < topY) {
        const cliff = cliffColor(tile, neighbor);
        push(p1.x, topY, p1.z, cliff);
        push(p1.x, neighborY, p1.z, cliff);
        push(p2.x, topY, p2.z, cliff);
        push(p1.x, neighborY, p1.z, cliff);
        push(p2.x, neighborY, p2.z, cliff);
        push(p2.x, topY, p2.z, cliff);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}
