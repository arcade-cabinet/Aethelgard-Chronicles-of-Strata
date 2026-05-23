import { RESOURCE_TYPES } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';

/** Short abbreviation per slot — keeps cost labels compact (e.g. "60w 40s 30sci"). */
const SLOT_ABBREV: Record<string, string> = {
  wood: 'w',
  stone: 's',
  gold: 'g',
  science: 'sci',
};

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

/**
 * Integer with locale-appropriate thousands separator (M_AUDIT2.UX.10).
 * At endgame "12845 gold" is harder to glance-parse than "12,845 gold";
 * apply to every HUD/modal number readout.
 */
export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.trunc(n).toLocaleString('en-US');
}

/**
 * Time formatter (M_AUDIT2.UX.11). MM:SS for under one hour;
 * H:MM:SS past that. Used by EndTurnButton, GameOverModal, and any
 * future timer surfaces.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
