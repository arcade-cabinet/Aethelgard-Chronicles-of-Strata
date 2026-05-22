import type { World } from 'koota';
import { areAdjacent, getHexKey } from '@/core/hex';
import { AssignedJob, Carrier, HexPosition } from '@/ecs/components';
import { addResource, type GameEconomy } from '@/game/economy';

/**
 * Deposit carried resources. A CARRYING peon adjacent to the Town Hall adds its
 * load to the economy, empties its Carrier, and returns to SEEKING so the
 * harvest loop continues. The Town Hall tile is unwalkable — a peon is never on
 * it — so adjacency is the only valid deposit position.
 */
export function depositSystem(world: World, economy: GameEconomy, townHallKey: string): void {
  world.query(AssignedJob, Carrier, HexPosition).updateEach(([job, carrier, hex]) => {
    if (job.state !== 'CARRYING' || carrier.carryType === 'none') return;
    const peonKey = getHexKey(hex.q, hex.r);
    if (!areAdjacent(peonKey, townHallKey)) return;
    addResource(economy, carrier.carryType, carrier.amount);
    carrier.carryType = 'none';
    carrier.amount = 0;
    job.state = 'SEEKING';
  });
}
