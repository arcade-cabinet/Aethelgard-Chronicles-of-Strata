import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Transform } from '@/ecs/components';
import type { DamageEvent } from '@/ecs/systems/combat';
import type { GameState } from '@/game/game-state';
import { WORLD_TEXT_FONT } from '@/world/world-text-font';

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
  /** M_EXPANSION.AU.46 — parry banner ("Parried!" in steel-blue). */
  isParry: boolean;
  /** Age in seconds. */
  age: number;
}

/**
 * Floating combat text. Each combat damage event from `game.lastDamageEvents`
 * spawns a `-N` popup at the target's world position; it drifts up and fades
 * over 1.6s. Crits show `★-N` larger in gold. Source: poc2.html `.popup-text`.
 *
 * New batches are detected by the `lastDamageEvents` array *reference* —
 * `runEconomyTick` assigns a fresh array each tick — so two consecutive
 * same-length batches are not mistaken for one. The popup id counter is a ref
 * so it is per-instance, not module-global.
 */
export function CombatText({ game }: { game: GameState }) {
  const [popups, setPopups] = useState<Popup[]>([]);
  const lastBatch = useRef<DamageEvent[] | null>(null);
  const nextId = useRef(0);

  useFrame((_, delta) => {
    // ingest a new damage-event batch (detected by array reference identity)
    const events = game.lastDamageEvents;
    if (events !== lastBatch.current && events.length > 0) {
      const fresh: Popup[] = events.map((e) => {
        const t = e.target.get(Transform);
        return {
          id: nextId.current++,
          origin: [t?.x ?? 0, (t?.y ?? 0) + 1.8, t?.z ?? 0] as [number, number, number],
          text: e.parried ? 'Parried!' : e.isCrit ? `★-${e.damage}` : `-${e.damage}`,
          isCrit: e.isCrit,
          isParry: e.parried,
          age: 0,
        };
      });
      setPopups((prev) => [...prev, ...fresh]);
    }
    lastBatch.current = events;

    // age and cull popups — M_MICRO.5.7: short-circuit the common
    // empty case so the per-frame setPopups doesn't churn a new
    // empty array reference 60 times a second.
    setPopups((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((p) => ({ ...p, age: p.age + delta })).filter((p) => p.age < POPUP_LIFETIME);
    });
  });

  return (
    <group name="combat-text">
      {popups.map((p) => {
        const t = p.age / POPUP_LIFETIME;
        return (
          <Billboard key={p.id} position={[p.origin[0], p.origin[1] + POPUP_RISE * t, p.origin[2]]}>
            <Text
              font={WORLD_TEXT_FONT}
              fontSize={p.isCrit ? 0.5 : p.isParry ? 0.4 : 0.35}
              color={p.isCrit ? '#fbbf24' : p.isParry ? '#94c5ff' : '#ef4444'}
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
