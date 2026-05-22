import type { World } from 'koota';
import { hexDistance } from '@/core/hex';
import {
  Building,
  type Faction,
  FactionTrait,
  Health,
  HexPosition,
  OffensiveBehavior,
  Unit,
  type UnitType,
} from '@/ecs/components';
import type { Rng } from '@/core/rng';

/** Military roles an offensive zone targets (peons are nonviolent — not targeted). */
const MILITARY: ReadonlySet<UnitType> = new Set([
  'Footman',
  'Goblin',
  'Orc',
  'Vampire',
  'Witch',
  'BlackKnight',
]);

/**
 * Offensive-behaviour system (spec 102). Iterates EVERY entity with an
 * `OffensiveBehavior` trait — not building-type-coupled. A Watchtower has one
 * today; a future Wonder could compose offensive + attractor; a future upgrade
 * could widen radius or add multi-target volleys without changing this system.
 *
 * Each tick, every offensive entity damages enemy MILITARY units inside its
 * radius. The event PRNG is reserved here for future arrow-emission jitter and
 * multi-target selection (spec 102 — decoupled aiming) — currently the simplest
 * correct behaviour is "deal `dps * delta` to every enemy military unit in
 * range". Each entity may only be damaged by ONE offensive source per tick to
 * avoid stacking. Buildings without an `isComplete` Building trait do not fire.
 */
export function offensiveBehaviorSystem(world: World, delta: number, _eventRng: Rng): void {
  // index offensive sources by faction + position + behaviour params
  const sources: Array<{ q: number; r: number; faction: Faction; radius: number; dps: number }> =
    [];
  for (const e of world.query(OffensiveBehavior, FactionTrait, HexPosition)) {
    // if the entity is a building, it must be COMPLETE to fire
    const b = e.get(Building);
    if (b && !b.isComplete) continue;
    const ob = e.get(OffensiveBehavior);
    const f = e.get(FactionTrait)?.faction;
    const h = e.get(HexPosition);
    if (!ob || !f || !h) continue;
    sources.push({ q: h.q, r: h.r, faction: f, radius: ob.radius, dps: ob.dps });
  }
  if (sources.length === 0) return;

  // each enemy military unit takes damage from at most ONE source this tick —
  // avoids double-stacking when multiple towers overlap. The first source in
  // range wins; the iteration is deterministic per query order.
  for (const e of world.query(Unit, FactionTrait, HexPosition, Health)) {
    const role = e.get(Unit)?.unitType;
    if (!role || !MILITARY.has(role)) continue;
    const unitFaction = e.get(FactionTrait)?.faction;
    const hex = e.get(HexPosition);
    const hp = e.get(Health);
    if (!unitFaction || !hex || !hp) continue;
    for (const s of sources) {
      if (s.faction === unitFaction) continue;
      if (hexDistance(s.q, s.r, hex.q, hex.r) <= s.radius) {
        hp.current = Math.max(0, hp.current - s.dps * delta);
        break;
      }
    }
  }
}
