import { RESOURCE_TYPES, type ResourceType } from '@/ecs/components';
import type { ResourceCost } from '@/game/economy';

/**
 * M_AUDIT2.UX.25 — unicode glyph per slot replaces the previous single-
 * letter abbreviations (w/s/g/sci). 'sci' was the worst offender; 'w'
 * and 's' were easily confused with 'wood'/'stone' but conveyed nothing
 * to a first-time player. The glyphs read in any locale.
 */
const SLOT_GLYPH: Record<ResourceType, string> = {
  wood: '🌲',
  stone: '🪨',
  gold: '🪙',
  science: '🧪',
};

/**
 * Compact resource-cost label — `"60🌲 40🪨"`, omitting zero/absent
 * slots. Slot-iterating; adding a 4th slot adds one row to SLOT_GLYPH.
 */
export function costLabel(cost: ResourceCost): string {
  const parts: string[] = [];
  for (const slot of RESOURCE_TYPES) {
    const amt = cost[slot] ?? 0;
    if (amt > 0) parts.push(`${amt}${SLOT_GLYPH[slot]}`);
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
