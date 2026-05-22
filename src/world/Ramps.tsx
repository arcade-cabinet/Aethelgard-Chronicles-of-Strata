import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld } from '@/core/hex';

/** Parse a `"q,r"` hex key into a numeric pair. */
function parseKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

/** Half-width of a ramp plank, in world units. */
const RAMP_HALF_WIDTH = HEX_RADIUS * 0.42;
/** Thickness the plank is lifted above the slope line. */
const RAMP_LIFT = 0.12;

/**
 * Build the merged ramp geometry. Every ramp is a sloped quad bridging the low
 * tile's top to the high tile's top, plus two thin side rails. Vertices are
 * placed at explicit world coordinates — the four plank corners are the low and
 * high endpoints offset left/right by the perpendicular — so there is no
 * rotation/quaternion step to get wrong. One mesh for the whole board.
 */
function buildRampGeometry(board: BoardData): BufferGeometry {
  const pos: number[] = [];

  /** Push two triangles for a quad given its four corners (CCW from a..d). */
  const quad = (
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    cx: number,
    cy: number,
    cz: number,
    dx: number,
    dy: number,
    dz: number,
  ) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    pos.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
  };

  for (const ramp of board.ramps.values()) {
    const low = parseKey(ramp.lowKey);
    const high = parseKey(ramp.highKey);
    const lowTile = board.tiles.get(ramp.lowKey);
    const highTile = board.tiles.get(ramp.highKey);
    if (!lowTile || !highTile) continue;

    const lowPos = axialToWorld(low.q, low.r);
    const highPos = axialToWorld(high.q, high.r);
    const lowY = lowTile.level * TILE_HEIGHT + RAMP_LIFT;
    const highY = highTile.level * TILE_HEIGHT + RAMP_LIFT;

    // unit vector along the ramp (low→high) in the XZ plane
    const dx = highPos.x - lowPos.x;
    const dz = highPos.z - lowPos.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    // perpendicular in XZ, scaled to half the plank width
    const px = -uz * RAMP_HALF_WIDTH;
    const pz = ux * RAMP_HALF_WIDTH;

    // four plank corners — low/high endpoints, each offset ±perpendicular
    const lL = { x: lowPos.x + px, y: lowY, z: lowPos.z + pz };
    const lR = { x: lowPos.x - px, y: lowY, z: lowPos.z - pz };
    const hL = { x: highPos.x + px, y: highY, z: highPos.z + pz };
    const hR = { x: highPos.x - px, y: highY, z: highPos.z - pz };

    // plank top surface (low-left → low-right → high-right → high-left)
    quad(lL.x, lL.y, lL.z, lR.x, lR.y, lR.z, hR.x, hR.y, hR.z, hL.x, hL.y, hL.z);
    // underside (reverse winding) so the plank reads solid from below
    quad(lL.x, lL.y, lL.z, hL.x, hL.y, hL.z, hR.x, hR.y, hR.z, lR.x, lR.y, lR.z);
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Wooden ramps connecting tiles to their one-level-higher neighbours — sloped
 * planks that bridge the cliff between two tile tops. Built as one merged
 * explicit-vertex mesh (no per-ramp rotation), so the slope is correct by
 * construction. Ramps are the only way units traverse elevation.
 */
export function Ramps({ board }: { board: BoardData }) {
  const geometry = useMemo(() => buildRampGeometry(board), [board]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#92400e" flatShading roughness={0.95} side={2} />
    </mesh>
  );
}
