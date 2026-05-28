import { Color } from 'three';
import { TILE_HEIGHT } from '@/config/world';
import type { BoardData, Tile } from '@/core/board';
import { axialToWorld, getHexCorner, getHexKey } from '@/core/hex';
import { biomeFlagsFor } from '@/rules/biome-flags';
import { BIOME_COLORS } from './biomes';

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

/** Fixed cliff-face colors by terrace tier — see `cliffColor`. */
const CLIFF_WATER = new Color('#0ea5e9');
const CLIFF_ROCK = new Color('#334155');
const CLIFF_DESERT = new Color('#92400e');
const CLIFF_DIRT = new Color('#78350f');

/**
 * Surface (top-face) color for a tile — the flat biome color, brightened toward
 * lush green on moist grass/forest tiles and toward snow-white on level-6
 * peaks, with a faint per-tile dither so wide terraces are not dead-flat.
 * Mirrors poc1's `getSurfaceColor`.
 */
function surfaceColor(tile: Tile): Color {
  const c = new Color(BIOME_COLORS[tile.type]);
  // M_REGISTRY.22 — lushBlend slot is the data answer to "does this
  // biome moisture-shift toward green?" (was a hand-rolled disjunction).
  if (biomeFlagsFor(tile.type).lushBlend) c.lerp(LUSH, tile.moisture);
  if (tile.level >= 6) {
    c.lerp(SNOW, 0.8);
  }
  // subtle deterministic lightness dither keyed off the tile coords
  const n = (((tile.q * 73 + tile.r * 149) % 7) - 3) * 0.012;
  c.offsetHSL(0, 0, n);
  return c;
}

/**
 * Cliff (vertical-face) color — a **fixed earth/rock tone by tier**, not a
 * blend of the two biomes. Every cliff of a tier shares one colour, so the
 * terrace walls read as continuous earth instead of a murky per-tile
 * patchwork. Mirrors poc1's `getCliffColor`.
 */
function cliffColor(top: Tile): Color {
  // M_REGISTRY.21 — biome cliffColor slot replaces the 2-biome type
  // branch ('LAKE' / 'DESERT'); elevation fallback (rock-vs-dirt by
  // tier) lives here since it's not biome-keyed.
  const tag = biomeFlagsFor(top.type).cliffColor;
  if (tag === 'water') return CLIFF_WATER;
  if (top.level >= 4) return CLIFF_ROCK;
  if (tag === 'desert') return CLIFF_DESERT;
  return CLIFF_DIRT;
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

      // Top-face triangle. Wound (center → p2 → p1) so the face normal points
      // +Y (up) — a consistent outward winding lets backface culling stay on.
      push(center.x, topY, center.z, surf);
      push(p2.x, topY, p2.z, surf);
      push(p1.x, topY, p1.z, surf);

      // cliff face on this edge if the neighbor is lower or off-board
      const dir = NEIGHBOR_DIRS[i];
      if (!dir) continue;
      const neighbor = board.tiles.get(getHexKey(tile.q + dir.q, tile.r + dir.r));
      const neighborY =
        neighbor && neighbor.level > 0 ? neighbor.level * TILE_HEIGHT : -TILE_HEIGHT * 1.5;
      if (neighborY < topY) {
        // Cliff quad, wound so its normal faces outward from the tile edge.
        // M_EXPANSION.S.66 — bottom verts get a 30%-darker cliff color
        // for an ambient-occlusion impression along the cliff base.
        // Vertex-color interpolation makes the cliff face fade darker
        // toward its foot — reads as a soft shadow without the cost of
        // a true shadow pass.
        const cliffTop = cliffColor(tile);
        const cliffBottom = cliffTop.clone().multiplyScalar(0.7);
        push(p1.x, topY, p1.z, cliffTop);
        push(p2.x, topY, p2.z, cliffTop);
        push(p1.x, neighborY, p1.z, cliffBottom);
        push(p1.x, neighborY, p1.z, cliffBottom);
        push(p2.x, topY, p2.z, cliffTop);
        push(p2.x, neighborY, p2.z, cliffBottom);
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
  };
}
