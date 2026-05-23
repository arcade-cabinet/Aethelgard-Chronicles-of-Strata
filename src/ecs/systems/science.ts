import type { World } from 'koota';
import { Building, FACTIONS, type Faction, FactionTrait, ScienceProducer } from '@/ecs/components';
import { addResource, type GameEconomy } from '@/game/economy';

/**
 * Passive science accumulation (M_FEATURE.3). Per tick, every COMPLETED
 * building with a `ScienceProducer` trait adds `rate * delta` to its
 * faction's science total. Plus a small flat trickle to every faction so
 * Discoveries are reachable even before a Library is built.
 *
 * Spec 102 + the user's "science accumulates from science buildings + rare
 * events" — this is the per-building half. The rare-event side is future
 * work (POST_REL polish).
 */

/** Per-tick passive science trickle per faction — small but non-zero. */
const PASSIVE_TRICKLE = 0.05;

export function scienceSystem(
  world: World,
  economy: Record<Faction, GameEconomy>,
  delta: number,
): void {
  // Passive trickle — every faction accumulates slowly so Discoveries
  // are always eventually reachable. M_REGISTRY.16: iterate FACTIONS
  // instead of hand-unrolling player+enemy so future tribes auto-tick.
  for (const f of FACTIONS) {
    addResource(economy[f], 'science', PASSIVE_TRICKLE * delta);
  }
  // Per-building producers (Library today). Only completed buildings
  // count — a half-built Library doesn't produce yet.
  for (const e of world.query(ScienceProducer, FactionTrait)) {
    const b = e.get(Building);
    if (b && !b.isComplete) continue;
    const rate = e.get(ScienceProducer)?.rate ?? 0;
    const faction = e.get(FactionTrait)?.faction;
    if (!faction || rate <= 0) continue;
    addResource(economy[faction], 'science', rate * delta);
  }
}
