import type { World } from 'koota';
import { areAdjacent, getHexKey } from '@/core/hex';
import { AssignedJob, Carrier, HexPosition } from '@/ecs/components';
import { addResource, type GameEconomy } from '@/game/economy';

/**
 * Deposit carried resources. A CARRYING peon adjacent to (or on) the Town Hall
 * tile adds its load to the economy, empties its Carrier, and returns to
 * SEEKING so the harvest loop continues.
 */
export function depositSystem(world: World, economy: GameEconomy, townHallKey: string): void {
  world.query(AssignedJob, Carrier, HexPosition).updateEach(([job, carrier, hex]) => {
    if (job.state !== 'CARRYING' || carrier.carryType === 'none') return;
    const peonKey = getHexKey(hex.q, hex.r);
    if (peonKey !== townHallKey && !areAdjacent(peonKey, townHallKey)) return;
    addResource(economy, carrier.carryType, carrier.amount);
    carrier.carryType = 'none';
    carrier.amount = 0;
    job.state = 'SEEKING';
  });
}
