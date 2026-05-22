import type { World } from 'koota';
import { DISCOVERIES_CONFIG, type DiscoveryEffect } from '@/config/discoveries';
import { Combatant, Harvester } from '@/ecs/components';
import type { Discovery } from './discoveries';

/**
 * Dispatch a declarative DiscoveryEffect to its ECS mutation. The CONFIG
 * (discoveries.json) says WHAT each Discovery does; THIS code says HOW each
 * effect kind mutates the world. Adding a new effect kind = a new variant in
 * `DiscoveryEffect` + a new case here. The Discovery rows themselves never
 * need code changes.
 */
function applyEffect(effect: DiscoveryEffect, world: World): void {
  switch (effect.kind) {
    case 'buff-combatant':
      world.query(Combatant).updateEach(([c]) => {
        if (effect.stat === 'attackDamage') c.attackDamage += effect.delta;
        else if (effect.stat === 'attackRange') c.attackRange += effect.delta;
      });
      break;
    case 'multiply-harvest':
      world.query(Harvester).updateEach(([h]) => {
        h.harvestRate *= effect.factor;
      });
      break;
  }
}

/**
 * The Discoveries registry — derived from discoveries.json + the effect
 * dispatcher. ONE table driving the HUD, the AI's potential goals, and
 * save/load. Adding a Discovery = a new row in discoveries.json. Adding a new
 * effect KIND = a variant in DiscoveryEffect + a case in applyEffect above.
 */
export const DISCOVERIES: ReadonlyArray<Discovery> = DISCOVERIES_CONFIG.discoveries.map(
  (config) => ({
    id: config.id,
    name: config.name,
    description: config.description,
    cost: config.cost,
    prereqs: config.prereqs,
    apply: (world: World) => applyEffect(config.effect, world),
  }),
);

/** Look up a Discovery by id. Returns undefined if unknown. */
export function discoveryById(id: string): Discovery | undefined {
  return DISCOVERIES.find((d) => d.id === id);
}
