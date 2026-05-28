import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { ResourceDepositEvent } from '@/ecs/systems/economy';
import type { GameState } from '@/game/game-state';
import { resourceDisplayFor } from '@/rules';
import { WorldBadge } from './WorldBadge';

/** Seconds a popup floats before it is removed. */
const POPUP_LIFETIME = 1.4;
/** World-units the popup drifts up over its lifetime. */
const POPUP_DRIFT = 1.8;

// M_AUDIT2.ARCH.2 — COLOR table collapsed into RESOURCE_DISPLAY in
// rules/display.ts; one source for the HUD bar text + this floating-
// popup color. Note: the wood color shift from the local '#f97316'
// (orange) to HUD_THEME.color.wood (matches HUD bar) is intentional;
// the prior table drifted from the HUD theme.

/** One floating "+N <kind>" popup. */
interface Popup {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  z: number;
  age: number;
}

/**
 * Floating resource-deposit popups (M_COMBAT_POLISH.3). Each entry in
 * `game.lastResourceEvents` spawns a "+N <kind>" popup at the deposit
 * position; drifts up, fades over POPUP_LIFETIME seconds, then removed.
 * New batches are detected by array-reference identity (same pattern as
 * CombatText / damage popups).
 */
export function ResourceText({ game }: { game: GameState }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const lastBatchRef = useRef<ResourceDepositEvent[] | null>(null);
  const nextIdRef = useRef(0);

  useFrame((_, delta) => {
    const events = game.lastResourceEvents;
    if (events !== lastBatchRef.current) {
      lastBatchRef.current = events;
      // only render the PLAYER's deposits — the enemy's would clutter the
      // board and the player can't act on them anyway
      const newOnes: Popup[] = events
        .filter((e) => e.faction === 'player')
        .map((e) => ({
          id: nextIdRef.current++,
          text: `+${e.amount} ${e.type}`,
          color: resourceDisplayFor(e.type).color,
          x: e.x,
          y: e.y + 1,
          z: e.z,
          age: 0,
        }));
      if (newOnes.length > 0) {
        setPopups((prev) => [...prev, ...newOnes]);
      }
    }
    setPopups((prev) => {
      const next = prev
        .map((p) => ({ ...p, age: p.age + delta, y: p.y + (POPUP_DRIFT * delta) / POPUP_LIFETIME }))
        .filter((p) => p.age < POPUP_LIFETIME);
      return next.length === prev.length && next.every((p, i) => p.id === prev[i]?.id)
        ? prev
        : next;
    });
  });

  return (
    <group name="resource-text">
      {popups.map((p) => {
        const opacity = 1 - p.age / POPUP_LIFETIME;
        // M_AUDIT2.ARCH.6 — WorldBadge owns the Billboard + Text +
        // outline defaults; this site declares only the per-popup data.
        return (
          <WorldBadge
            key={p.id}
            x={p.x}
            y={p.y}
            z={p.z}
            text={p.text}
            color={p.color}
            fillOpacity={opacity}
          />
        );
      })}
    </group>
  );
}
