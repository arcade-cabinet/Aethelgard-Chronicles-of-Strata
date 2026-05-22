import { RESOURCE_TYPES } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';

/** Short single-letter abbreviation per slot — keeps cost labels compact. */
const SLOT_ABBREV: Record<string, string> = { wood: 'w', stone: 's', gold: 'g' };

/**
 * Compact resource-cost label — `"60w 40s"`, omitting zero/absent slots.
 * Slot-iterating — adding a 4th slot needs no change here as long as it has
 * an abbreviation registered.
 */
export function costLabel(cost: ResourceCost): string {
  const parts: string[] = [];
  for (const slot of RESOURCE_TYPES) {
    const amt = cost[slot] ?? 0;
    if (amt > 0) parts.push(`${amt}${SLOT_ABBREV[slot] ?? slot[0]}`);
  }
  return parts.join(' ') || 'free';
}
