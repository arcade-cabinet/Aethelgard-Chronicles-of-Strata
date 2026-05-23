import type { World } from 'koota';
import { axialToWorld, getHexKey, hexDistance } from '@/core/hex';
import {
  type Faction,
  FactionBase,
  FactionTrait,
  HexPosition,
  Transform,
  Unit,
} from '@/ecs/components';

/**
 * Per-faction territory + perception. Two independent sets (spec 102):
 *
 * - `controlled` — tiles this faction HOLDS. A tile is claimed the moment one
 *   of the faction's peons begins exploiting it; released when the resource is
 *   cleared or the tile is lost to encroachment. Drawn as the zone-of-control
 *   border.
 * - `observed` — tiles inside a unit's vision cone or a base's vision circle
 *   THIS tick — the "observed battlefield". Recomputed every tick. Independent
 *   of `controlled`: an enemy can stand on your controlled tile unobserved.
 *
 * Replaces the fog-of-war `discovered`/`visible` model — the map is always
 * fully visible; territory is shown by drawn borders, not concealment.
 */
export interface ZoneState {
  /** Tile keys this faction controls (claimed by peon exploitation). */
  controlled: Set<string>;
  /** Tile keys currently inside this faction's vision this tick. */
  observed: Set<string>;
  /**
   * Pulsing tiles under encroachment (spec 102) — keyed by tile, the value is
   * how many seconds the pulse has been running. When the pulse exceeds the
   * encroachment grace window, the tile flips to the encroaching faction.
   */
  pulsing: Map<string, number>;
}

/** Create an empty zone state — no territory, nothing observed. */
export function createZoneState(): ZoneState {
  return { controlled: new Set(), observed: new Set(), pulsing: new Map() };
}

/** Claim a tile for a faction — called when a peon begins exploiting it. */
export function claimTile(zone: ZoneState, key: string): void {
  zone.controlled.add(key);
}

/** Release a controlled tile — resource cleared, or lost to encroachment. */
export function releaseTile(zone: ZoneState, key: string): void {
  zone.controlled.delete(key);
}

/** Default vision-cone radius (hex tiles) of a unit. */
export const BASE_UNIT_VISION_RADIUS = 5;
/** Half-angle of a unit's forward vision cone, in radians (≈ 70° total). */
const UNIT_CONE_HALF_ANGLE = Math.PI * 0.39;
/** Vision radius (hex tiles) of a base — a full 360° circle. */
const BASE_VISION_RADIUS = 7;

/** A perceiving source: a position, a facing, and a vision shape. */
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
  // cone test — bearing from source to tile, in world XZ space, within the
  // half-angle of the unit's facing.
  const from = axialToWorld(source.q, source.r);
  const to = axialToWorld(tq, tr);
  const bearing = Math.atan2(to.x - from.x, to.z - from.z);
  let delta = bearing - source.facing;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return Math.abs(delta) <= UNIT_CONE_HALF_ANGLE;
}

/**
 * Recompute a faction's `observed` set for the current tick — every tile under
 * one of its unit vision cones or base circles. `unitVisionRadius` scales with
 * difficulty (spec 102 — Easy narrow, Hard wide); defaults to the base radius.
 */
export function updateObserved(
  zone: ZoneState,
  world: World,
  faction: Faction,
  allTiles: Iterable<{ q: number; r: number }>,
  unitVisionRadius: number = BASE_UNIT_VISION_RADIUS,
): void {
  const sources: VisionSource[] = [];

  for (const e of world.query(Unit, HexPosition, FactionTrait, Transform)) {
    if (e.get(FactionTrait)?.faction !== faction) continue;
    const hex = e.get(HexPosition);
    const tf = e.get(Transform);
    if (!hex || !tf) continue;
    sources.push({
      q: hex.q,
      r: hex.r,
      facing: tf.rotationY,
      radius: unitVisionRadius,
      circle: false,
    });
  }

  for (const e of world.query(FactionBase, HexPosition)) {
    if (e.get(FactionBase)?.faction !== faction) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    sources.push({ q: hex.q, r: hex.r, facing: 0, radius: BASE_VISION_RADIUS, circle: true });
  }

  zone.observed.clear();
  for (const tile of allTiles) {
    for (const source of sources) {
      if (tileInVision(source, tile.q, tile.r)) {
        zone.observed.add(getHexKey(tile.q, tile.r));
        break;
      }
    }
  }
}

/** Whether a faction currently observes a tile (it is on the observed battlefield). */
export function isObserved(zone: ZoneState, key: string): boolean {
  return zone.observed.has(key);
}

/** Which faction controls a tile, or `null` if it is neutral/uncontrolled. */
export function tileController(zones: Record<Faction, ZoneState>, key: string): Faction | null {
  if (zones.player.controlled.has(key)) return 'player';
  if (zones.enemy.controlled.has(key)) return 'enemy';
  return null;
}

/**
 * Seed each faction's `controlled` set with the attractor footprint around
 * its base — every walkable tile within ATTRACTOR_RADIUS hexes of the
 * faction's anchor counts as initially-controlled (M_MAPGEN.1). Without
 * this, the home base appeared to emit no zone of control because the
 * encroachment system only flips tiles, never seeds them.
 */
export function seedZonesFromAttractors(
  zones: Record<Faction, ZoneState>,
  board: import('@/core/board').BoardData,
  centers: Record<Faction, { q: number; r: number }>,
): Record<Faction, ZoneState> {
  const RADIUS = 2;
  for (const f of ['player', 'enemy'] as const) {
    const center = centers[f];
    for (const tile of board.tiles.values()) {
      if (!tile.walkable) continue;
      const d =
        (Math.abs(tile.q - center.q) +
          Math.abs(tile.r - center.r) +
          Math.abs(tile.q + tile.r - center.q - center.r)) /
        2;
      if (d <= RADIUS) zones[f].controlled.add(getHexKey(tile.q, tile.r));
    }
  }
  return zones;
}
