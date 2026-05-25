/**
 * M_FUN.PERF.TILE-INDEX — shared per-tick tile→entity index.
 *
 * `buildEntityTileIndex` does ONE `world.query(Health, HexPosition)` scan
 * and returns a `Map<tileKey, Entity[]>`. Every hazard system (wildfire,
 * volcano, future hazards) calls `Map.get(key)` instead of its own
 * O(entities) scan per affected tile.
 *
 * Typical mid-game savings (10 burns, 30 entities): 300 scans → 30 scans
 * + 10 Map.get(). Scales linearly with burns/eruptions, not with entities.
 */
import type { Entity, World } from 'koota';
import { getHexKey } from '@/core/hex';
import { Health, HexPosition } from '@/ecs/components';

/** Opaque entity type — same as koota's query result element. */
export type AnyHealthEntity = Entity;

/**
 * Build a tile-key→entity index for all entities that have both a Health
 * component and a HexPosition component. Called once per tick, before
 * hazard systems run, and shared across all hazard systems in that tick.
 */
export function buildEntityTileIndex(world: World): Map<string, AnyHealthEntity[]> {
  const index = new Map<string, AnyHealthEntity[]>();
  for (const e of world.query(Health, HexPosition)) {
    const pos = e.get(HexPosition);
    if (!pos) continue;
    const k = getHexKey(pos.q, pos.r);
    let list = index.get(k);
    if (!list) {
      list = [];
      index.set(k, list);
    }
    list.push(e);
  }
  return index;
}
