import type { World } from 'koota';
import { areAdjacent, axialToWorld, getHexKey } from '@/core/hex';
import {
  AssignedJob,
  Carrier,
  type Faction,
  FactionTrait,
  HexPosition,
  type ResourceType,
} from '@/ecs/components';
import { type GameEconomy, addResource } from '@/game/economy';

/** A resource-popup event captured per deposit — fuels floating "+N Wood" text. */
export interface ResourceDepositEvent {
  type: ResourceType;
  amount: number;
  /** World position of the deposit (for the floating popup). */
  x: number;
  y: number;
  z: number;
  faction: Faction;
}

/**
 * Deposit carried resources for one faction. A CARRYING peon of `faction`,
 * adjacent to that faction's base tile (`baseKey`), adds its load to that
 * faction's `economy`, empties its Carrier, and returns to SEEKING so the
 * harvest loop continues. The base tile is unwalkable — a peon is never on it —
 * so adjacency is the only valid deposit position. Run once per faction.
 *
 * Optionally appends to `events` a ResourceDepositEvent per deposit so the
 * render layer can show a floating "+N Wood" popup (M_COMBAT_POLISH.3).
 */
export function depositSystem(
  world: World,
  economy: GameEconomy,
  baseKey: string,
  faction: Faction,
  events?: ResourceDepositEvent[],
): void {
  world
    .query(AssignedJob, Carrier, HexPosition, FactionTrait)
    .updateEach(([job, carrier, hex], e) => {
      if (e.get(FactionTrait)?.faction !== faction) return;
      if (job.state !== 'CARRYING' || carrier.carryType === 'none') return;
      const peonKey = getHexKey(hex.q, hex.r);
      if (!areAdjacent(peonKey, baseKey)) return;
      const type = carrier.carryType;
      const amount = carrier.amount;
      addResource(economy, type, amount);
      if (events) {
        const w = axialToWorld(hex.q, hex.r);
        events.push({ type: type as ResourceType, amount, x: w.x, y: hex.level, z: w.z, faction });
      }
      carrier.carryType = 'none';
      carrier.amount = 0;
      job.state = 'SEEKING';
    });
}
