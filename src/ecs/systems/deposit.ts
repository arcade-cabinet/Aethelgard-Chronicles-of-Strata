import type { World } from 'koota';
import { areAdjacent, getHexKey } from '@/core/hex';
import { AssignedJob, Carrier, type Faction, FactionTrait, HexPosition } from '@/ecs/components';
import { type GameEconomy, addResource } from '@/game/economy';

/**
 * Deposit carried resources for one faction. A CARRYING peon of `faction`,
 * adjacent to that faction's base tile (`baseKey`), adds its load to that
 * faction's `economy`, empties its Carrier, and returns to SEEKING so the
 * harvest loop continues. The base tile is unwalkable — a peon is never on it —
 * so adjacency is the only valid deposit position. Run once per faction.
 */
export function depositSystem(
  world: World,
  economy: GameEconomy,
  baseKey: string,
  faction: Faction,
): void {
  world
    .query(AssignedJob, Carrier, HexPosition, FactionTrait)
    .updateEach(([job, carrier, hex], e) => {
      if (e.get(FactionTrait)?.faction !== faction) return;
      if (job.state !== 'CARRYING' || carrier.carryType === 'none') return;
      const peonKey = getHexKey(hex.q, hex.r);
      if (!areAdjacent(peonKey, baseKey)) return;
      addResource(economy, carrier.carryType, carrier.amount);
      carrier.carryType = 'none';
      carrier.amount = 0;
      job.state = 'SEEKING';
    });
}
