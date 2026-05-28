/**
 * M_V11.UNITS-EXPANSION (#77d runtime wire-up) — Engineer repair.
 *
 * For each Engineer unit, scan friendly Buildings within 1 hex.
 * Any building with HP below max gets +5 hp / second of healing,
 * scaled by delta. Friendly-only: hostile factions don't get the
 * benefit even if a Diplomat / Engineer of a different faction is
 * adjacent.
 *
 * Cheap O(engineers × adjacent_buildings) — small in any practical
 * match.
 */
import { Building, FactionTrait, Health, HexPosition, Unit } from '@/ecs/components';
import { getHexKey, hexNeighbors } from '@/core/hex';
import type { GameState } from '@/game/game-state';

const REPAIR_RATE_PER_SECOND = 5;

export function engineerRepairSystem(game: GameState, delta: number): void {
  if (delta <= 0) return;
  // Pre-index buildings by hex key so the inner loop is O(1) per
  // engineer-neighbour. The entity reference goes into the map so
  // we can call .set(Health, ...) after applying repair.
  const buildingByKey = new Map<
    string,
    { entity: ReturnType<typeof game.world.spawn>; faction: string; current: number; max: number }
  >();
  for (const b of game.world.query(Building, FactionTrait, HexPosition, Health)) {
    const hex = b.get(HexPosition);
    const faction = b.get(FactionTrait)?.faction;
    const health = b.get(Health);
    const building = b.get(Building);
    if (!hex || !faction || !health || !building?.isComplete) continue;
    if (health.current >= health.max) continue;
    buildingByKey.set(getHexKey(hex.q, hex.r), {
      entity: b,
      faction,
      current: health.current,
      max: health.max,
    });
  }
  if (buildingByKey.size === 0) return;

  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    if (e.get(Unit)?.unitType !== 'Engineer') continue;
    const faction = e.get(FactionTrait)?.faction;
    if (!faction) continue;
    const hex = e.get(HexPosition);
    if (!hex) continue;
    const own = getHexKey(hex.q, hex.r);
    const adjacent = [own, ...hexNeighbors(hex.q, hex.r)];
    for (const adj of adjacent) {
      const target = buildingByKey.get(adj);
      if (!target || target.faction !== faction) continue;
      const healAmount = REPAIR_RATE_PER_SECOND * delta;
      const next = Math.min(target.max, target.current + healAmount);
      const live = target.entity.get(Health);
      if (live) target.entity.set(Health, { ...live, current: next });
      target.current = next;
      if (next >= target.max) buildingByKey.delete(adj);
    }
  }
}
