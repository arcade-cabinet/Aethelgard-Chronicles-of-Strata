import { Combatant, Harvester } from '@/ecs/components';
import { researchCostFor } from '@/config/economy';
import type { Discovery } from './discoveries';

/**
 * The Discoveries registry — every Discovery available in the game. ONE table
 * driving the HUD, the AI's potential goals, and save/load. Adding a new
 * Discovery is a new row HERE; no system changes elsewhere.
 *
 * The two legacy researches (Forged Blades, Steel Plows) are migrated to
 * Discovery rows. Their costs still come from the existing economy.json
 * `researchCosts` block so behaviour is byte-equivalent during the
 * migration; future Discoveries can declare costs that include science.
 */
export const DISCOVERIES: ReadonlyArray<Discovery> = [
  {
    id: 'forgedBlades',
    name: 'Forged Blades',
    description: '+5 attack damage to every combatant.',
    cost: researchCostFor('forgedBlades'),
    apply: (world) => {
      world.query(Combatant).updateEach(([c]) => {
        c.attackDamage += 5;
      });
    },
  },
  {
    id: 'steelPlows',
    name: 'Steel Plows',
    description: '×1.5 harvest rate on every peon.',
    cost: researchCostFor('steelPlows'),
    apply: (world) => {
      world.query(Harvester).updateEach(([h]) => {
        h.harvestRate *= 1.5;
      });
    },
  },
];

/** Look up a Discovery by id. Returns undefined if unknown. */
export function discoveryById(id: string): Discovery | undefined {
  return DISCOVERIES.find((d) => d.id === id);
}
