import { useEffect, useMemo } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import type { CrossingStyle } from '@/core/biome';
import type { BoardData } from '@/core/board';
import type { Crossing } from '@/core/crossings';
import { axialToWorld, parseHexKey as parseKey } from '@/core/hex';
// M_MICRO.2.2 — local parseKey aliased to shared parseHexKey to
// keep call-sites unchanged.

// M_AUDIT2.ARCH.17 — tuning moved to config/world.json
// (WORLD.crossings). The const aliases here keep the call-sites
// unchanged.
import { WORLD } from '@/config/world';

const HALF_WIDTH = HEX_RADIUS * WORLD.crossings.halfWidth;
const LIFT = WORLD.crossings.lift;
const STAIR_STEPS = WORLD.crossings.stairSteps;

/**
 * M_REGISTRY.12 — per-(style, form) crossing material color lifted into
 * a CROSSING_PROFILES table. The 2 nested switches collapsed into ONE
 * keyed lookup. Adding a new CrossingStyle = ONE row per form (or one
 * row total if natural+artificial share); the lookup stays a table read.
 *
 * Key shape: `${form}:${style}` — keeps the table flat + grep-friendly.
 * See `docs/specs/99-passability-and-slopes.md`.
 */
const CROSSING_PROFILES: Record<string, string> = {
  // Artificial — built surfaces.
  'artificial:stone': '#9ca3af', // carved stone
  'artificial:mountain': '#9ca3af', // carved stone
  'artificial:sand': '#b45309', // boardwalk planks (sun-bleached)
  'artificial:dirt': '#92400e', // wooden plank ramp (default)
  // Natural — terrain features.
  'natural:stone': '#6b7280', // rockfall / scree
  'natural:mountain': '#6b7280', // rockfall / scree
  'natural:sand': '#d9b772', // sand rise
  'natural:dirt': '#4d7c0f', // graded grassy hill (default)
};

function crossingColor(style: CrossingStyle, form: Crossing['form']): string {
  return (
    CROSSING_PROFILES[`${form}:${style}`] ??
    // Fallback to the per-form default style (dirt) when an unknown
    // style is encountered — preserves the legacy switch's behaviour.
    CROSSING_PROFILES[`${form}:dirt`] ??
    '#92400e'
  );
}

/** XYZ point. */
interface P3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Triangulate one crossing's surface into `pos`. Artificial crossings of a
 * stone style are cut into `STAIR_STEPS` staggered steps (each a flat tread +
 * a vertical riser); every other crossing is a single sloped quad (plank ramp,
 * boardwalk, rockfall, graded hill).
 */
function buildCrossing(
  pos: number[],
  lowPos: { x: number; z: number },
  highPos: { x: number; z: number },
  lowY: number,
  highY: number,
  stepped: boolean,
): void {
  const dx = highPos.x - lowPos.x;
  const dz = highPos.z - lowPos.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  // perpendicular in XZ, scaled to half-width
  const px = -uz * HALF_WIDTH;
  const pz = uz === 0 && ux === 0 ? 0 : ux * HALF_WIDTH;

  /** Quad from four corners, both windings so it reads solid from either side. */
  const quad = (a: P3, b: P3, c: P3, d: P3) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    pos.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    pos.push(a.x, a.y, a.z, d.x, d.y, d.z, c.x, c.y, c.z);
  };
  /** A point a fraction `t` along the run, at height `y`, offset `side` (±1). */
  const at = (t: number, y: number, side: number): P3 => ({
    x: lowPos.x + dx * t + px * side,
    y,
    z: lowPos.z + dz * t + pz * side,
  });

  if (stepped) {
    // staggered steps: each step is a flat tread then a vertical riser
    for (let i = 0; i < STAIR_STEPS; i++) {
      const t0 = i / STAIR_STEPS;
      const t1 = (i + 1) / STAIR_STEPS;
      const yTread = lowY + (highY - lowY) * t1;
      // tread (flat top of the step)
      quad(at(t0, yTread, 1), at(t0, yTread, -1), at(t1, yTread, -1), at(t1, yTread, 1));
      // riser (vertical face up to this tread)
      const yPrev = lowY + (highY - lowY) * t0;
      quad(at(t0, yPrev, 1), at(t0, yPrev, -1), at(t0, yTread, -1), at(t0, yTread, 1));
    }
  } else {
    // one sloped surface low→high
    quad(at(0, lowY, 1), at(0, lowY, -1), at(1, highY, -1), at(1, highY, 1));
  }
}

/** All crossings of one render group (a style + form combination). */
function buildGroupGeometry(board: BoardData, group: Crossing[]): BufferGeometry {
  const pos: number[] = [];
  for (const c of group) {
    const low = parseKey(c.lowKey);
    const high = parseKey(c.highKey);
    const lowTile = board.tiles.get(c.lowKey);
    const highTile = board.tiles.get(c.highKey);
    if (!lowTile || !highTile) continue;
    const stepped = c.form === 'artificial' && (c.style === 'stone' || c.style === 'mountain');
    buildCrossing(
      pos,
      axialToWorld(low.q, low.r),
      axialToWorld(high.q, high.r),
      lowTile.level * TILE_HEIGHT + LIFT,
      highTile.level * TILE_HEIGHT + LIFT,
      stepped,
    );
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.computeVertexNormals();
  return geo;
}

/** One merged mesh per (style, form) group, with its own material. */
function CrossingGroup({
  board,
  group,
  color,
  rough,
}: {
  board: BoardData;
  group: Crossing[];
  color: string;
  rough: number;
}) {
  const geometry = useMemo(() => buildGroupGeometry(board, group), [board, group]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} flatShading roughness={rough} side={2} />
    </mesh>
  );
}

/**
 * Renders every placed crossing in its contextual form: artificial stone
 * crossings as staggered carved stairs, artificial grass/sand as plank ramps /
 * boardwalks, natural crossings as rockfalls / graded hills / sand rises.
 * Crossings are grouped by `(style, form)` so each renders as one merged mesh
 * with the right material. See `docs/specs/99-passability-and-slopes.md`.
 */
export function Crossings({ board }: { board: BoardData }) {
  const groups = useMemo(() => {
    const byKey = new Map<string, Crossing[]>();
    for (const c of board.crossings.values()) {
      const k = `${c.style}:${c.form}`;
      const list = byKey.get(k);
      if (list) list.push(c);
      else byKey.set(k, [c]);
    }
    return byKey;
  }, [board]);

  return (
    <group name="crossings">
      {[...groups.entries()].map(([k, group]) => {
        const [style, form] = k.split(':') as [CrossingStyle, Crossing['form']];
        return (
          <CrossingGroup
            key={k}
            board={board}
            group={group}
            color={crossingColor(style, form)}
            rough={form === 'artificial' ? 0.85 : 0.97}
          />
        );
      })}
    </group>
  );
}
