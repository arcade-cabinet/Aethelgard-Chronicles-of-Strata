import type { World } from 'koota';
import { axialToWorld, getHexKey, hexDistance } from '@/core/hex';
import { FactionBase, FactionTrait, HexPosition, Transform, Unit } from '@/ecs/components';
import type { Faction } from '@/ecs/components';

/**
 * Per-faction fog of war. A faction knows only what it has perceived:
 *
 * - `visible`  — tiles inside a unit's vision cone or a base's vision circle
 *   *this tick*. Recomputed every fog tick.
 * - `discovered` — every tile ever made visible. Monotonic; once seen, the
 *   terrain stays known (classic RTS fog — explored but not currently watched).
 * - anything in neither set is `unknown`.
 *
 * The AI player (M8.6) may only issue commands against tiles/entities in its
 * own `discovered` set — its perception is the same as a human's. See
 * `docs/specs/100-ai-as-player.md`.
 */
export interface FogState {
  /** Tile keys currently inside this faction's vision. */
  visible: Set<string>;
  /** Tile keys this faction has ever seen. */
  discovered: Set<string>;
}

/** Create an empty fog state — nothing seen yet. */
export function createFogState(): FogState {
  return { visible: new Set(), discovered: new Set() };
}

/** Vision radius (hex tiles) of a unit's cone. */
const UNIT_VISION_RADIUS = 5;
/** Half-angle of a unit's forward vision cone, in radians (≈ 70° total). */
const UNIT_CONE_HALF_ANGLE = Math.PI * 0.39;
/** Vision radius (hex tiles) of a base — a full 360° circle. */
const BASE_VISION_RADIUS = 7;

/** A perceiving source: a world position, a facing, and a vision shape. */
interface VisionSource {
  q: number;
  r: number;
  /** Facing in radians (`atan2(dx,dz)` convention); ignored for circles. */
  facing: number;
  /** Vision radius in hex tiles. */
  radius: number;
  /** `true` for a 360° circle (a base), `false` for a forward cone (a unit). */
  circle: boolean;
}

/** Whether tile (tq,tr) falls inside `source`'s vision shape. */
function tileInVision(source: VisionSource, tq: number, tr: number): boolean {
  const dist = hexDistance(source.q, source.r, tq, tr);
  if (dist > source.radius) return false;
  if (source.circle || dist === 0) return true;
  // cone test — the bearing from the source to the tile, in world XZ space,
  // must lie within the half-angle of the unit's facing.
  const from = axialToWorld(source.q, source.r);
  const to = axialToWorld(tq, tr);
  const bearing = Math.atan2(to.x - from.x, to.z - from.z);
  let delta = bearing - source.facing;
  // normalise to [-π, π]
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return Math.abs(delta) <= UNIT_CONE_HALF_ANGLE;
}

/**
 * Recompute a faction's fog for the current tick: gather every vision source
 * the faction owns (units as forward cones, bases as full circles), mark every
 * tile any source can see as `visible`, and union those into `discovered`.
 *
 * `allTileKeys` is the set of board tile keys to test against.
 */
export function updateFog(
  fog: FogState,
  world: World,
  faction: Faction,
  allTiles: Iterable<{ q: number; r: number }>,
): void {
  const sources: VisionSource[] = [];

  // units — forward cones
  for (const e of world.query(Unit, HexPosition, FactionTrait, Transform)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    const hex = e.get(HexPosition);
    const tf = e.get(Transform);
    if (!hex || !tf) continue;
    sources.push({
      q: hex.q,
      r: hex.r,
      facing: tf.rotationY,
      radius: UNIT_VISION_RADIUS,
      circle: false,
    });
  }

  // bases — full circles
  for (const e of world.query(FactionBase, HexPosition)) {
    if (e.get(FactionBase)?.faction !== faction) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    sources.push({ q: hex.q, r: hex.r, facing: 0, radius: BASE_VISION_RADIUS, circle: true });
  }

  fog.visible.clear();
  for (const tile of allTiles) {
    for (const source of sources) {
      if (tileInVision(source, tile.q, tile.r)) {
        const key = getHexKey(tile.q, tile.r);
        fog.visible.add(key);
        fog.discovered.add(key);
        break;
      }
    }
  }
}

/** The perception class of a tile for a faction's fog. */
export type TileVisibility = 'visible' | 'discovered' | 'unknown';

/** Classify a tile key against a fog state. */
export function tileVisibility(fog: FogState, key: string): TileVisibility {
  if (fog.visible.has(key)) return 'visible';
  if (fog.discovered.has(key)) return 'discovered';
  return 'unknown';
}
