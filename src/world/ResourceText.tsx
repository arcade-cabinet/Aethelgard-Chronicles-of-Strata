import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { ResourceDepositEvent } from '@/ecs/systems/deposit';
import type { GameState } from '@/game/game-state';

/** Seconds a popup floats before it is removed. */
const POPUP_LIFETIME = 1.4;
/** World-units the popup drifts up over its lifetime. */
const POPUP_DRIFT = 1.8;

/** Per-resource colour for the popup. */
const COLOR: Record<string, string> = {
  wood: '#f97316',
  stone: '#94a3b8',
  gold: '#fbbf24',
  science: '#38bdf8',
};

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
          color: COLOR[e.type] ?? '#fff',
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
        return (
          <Billboard key={p.id} position={[p.x, p.y, p.z]}>
            <Text
              fontSize={0.42}
              color={p.color}
              outlineWidth={0.04}
              outlineColor="#000"
              fillOpacity={opacity}
              anchorX="center"
              anchorY="middle"
            >
              {p.text}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}
