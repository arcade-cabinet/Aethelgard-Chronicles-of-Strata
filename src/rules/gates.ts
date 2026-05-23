import type { Entity, World } from 'koota';
import { getHexKey } from '@/core/hex';
import { type Faction, FactionTrait, Gate, HexPosition, MoverBehavior } from '@/ecs/components';

/**
 * Gate-passability lookup (M_ARCHETYPE.2). For each tile holding a Gate,
 * map it to the faction the gate is OPEN for. Pathfinding consults this:
 * a tile is treated as walkable for `faction` iff the gate's faction
 * matches (or the tile has no gate at all).
 *
 * Built once per pathfinding pass (cheap — gates are rare). Lookup is by
 * tile key — entities never need to be reached again.
 */
export function buildGateMap(world: World): Map<string, Faction> {
  const out = new Map<string, Faction>();
  for (const e of world.query(Gate, HexPosition)) {
    const g = e.get(Gate);
    const h = e.get(HexPosition);
    if (g && h) out.set(getHexKey(h.q, h.r), g.faction);
  }
  return out;
}

/**
 * Whether `tileKey` is passable for `faction`. A tile with no gate is
 * passable (the existing nav-graph already enforces base walkability).
 * A tile WITH a gate is passable only for the gate's faction.
 */
export function tilePassable(
  gates: ReadonlyMap<string, Faction>,
  tileKey: string,
  faction: Faction,
): boolean {
  const gateFaction = gates.get(tileKey);
  return gateFaction === undefined || gateFaction === faction;
}

/**
 * Materialise a Gate on the entity that was placed on a tile holding a
 * DefensiveBehavior — composes the Mover-on-Defender pattern (spec 102).
 * The placing faction's units cross the gate freely; the other side finds
 * it impassable. The Mover entity gains a Gate trait; the underlying
 * DefensiveBehavior + HexPosition + FactionTrait are preserved.
 */
export function materialiseGate(entity: Entity, faction: Faction): void {
  entity.add(Gate({ faction }));
  // ensure FactionTrait is consistent — a gate is faction-owned even if the
  // road was placed neutrally elsewhere
  if (!entity.has(FactionTrait)) entity.add(FactionTrait({ faction }));
}

// MoverBehavior is part of the gate concept; importing it here so a future
// gate-decay / wall-destruction system can read the material from one source.
void MoverBehavior;
