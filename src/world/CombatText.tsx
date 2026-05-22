import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Transform } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Seconds a damage popup floats before it is removed. */
const POPUP_LIFETIME = 1.6;
/** How far up the popup drifts over its lifetime, in world units. */
const POPUP_RISE = 1.4;

/** One active floating-text popup. */
interface Popup {
  /** Unique key. */
  id: number;
  /** World position at spawn. */
  origin: [number, number, number];
  /** Display text. */
  text: string;
  /** Whether the hit was a crit (larger, gold). */
  isCrit: boolean;
  /** Age in seconds. */
  age: number;
}

let nextPopupId = 0;

/**
 * Floating combat text. Each combat damage event from `game.lastDamageEvents`
 * spawns a `-N` popup at the target's world position; it drifts up and fades
 * over 1.6s. Crits show `★-N` larger in gold. Source: poc2.html `.popup-text`.
 */
export function CombatText({ game }: { game: GameState }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const seen = useRef(0);

  useFrame((_, delta) => {
    // ingest new damage events produced this tick
    const events = game.lastDamageEvents;
    if (events.length > 0 && seen.current !== events.length) {
      const fresh: Popup[] = events.map((e) => {
        const t = e.target.get(Transform);
        return {
          id: nextPopupId++,
          origin: [t?.x ?? 0, (t?.y ?? 0) + 1.8, t?.z ?? 0],
          text: e.isCrit ? `★-${e.damage}` : `-${e.damage}`,
          isCrit: e.isCrit,
          age: 0,
        };
      });
      seen.current = events.length;
      setPopups((prev) => [...prev, ...fresh]);
    } else if (events.length === 0) {
      seen.current = 0;
    }

    // age and cull popups
    setPopups((prev) =>
      prev.map((p) => ({ ...p, age: p.age + delta })).filter((p) => p.age < POPUP_LIFETIME),
    );
  });

  return (
    <group name="combat-text">
      {popups.map((p) => {
        const t = p.age / POPUP_LIFETIME;
        return (
          <Billboard key={p.id} position={[p.origin[0], p.origin[1] + POPUP_RISE * t, p.origin[2]]}>
            <Text
              fontSize={p.isCrit ? 0.5 : 0.35}
              color={p.isCrit ? '#fbbf24' : '#ef4444'}
              outlineWidth={0.02}
              outlineColor="#0b0f17"
              fillOpacity={1 - t}
              outlineOpacity={1 - t}
            >
              {p.text}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}
