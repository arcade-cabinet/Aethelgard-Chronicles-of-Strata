import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { SphereGeometry } from 'three';
import { unpackEntity } from 'koota';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { Building, HexPosition } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** One transient dust-puff effect. */
interface Puff {
  id: number;
  x: number;
  y: number;
  z: number;
  age: number;
}

const PUFF_LIFETIME = 1.0;
const PUFF_MAX_RADIUS = HEX_RADIUS * 0.9;
const puffGeo = new SphereGeometry(1, 12, 8);

/**
 * Dust-puff completion FX (M_POLISH.1). Watches `Building` entities each
 * frame; the first time we see one transition to `isComplete`, spawn a
 * brief expanding-+-fading dust cloud at its tile. Pure presentation —
 * the completion sound is owned by useAudio independently.
 */
export function BuildCompleteFX({ game }: { game: GameState }) {
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const seenRef = useRef<Set<number>>(new Set());
  const nextIdRef = useRef(0);

  useFrame((_, delta) => {
    // Detect transitions: find any Building that's complete + we haven't
    // seen yet. Building entities are stable across the session, so the
    // seenRef identity check is cheap.
    let added: Puff[] | null = null;
    for (const e of game.world.query(Building, HexPosition)) {
      if (!e.get(Building)?.isComplete) continue;
      const id = unpackEntity(e).entityId;
      if (seenRef.current.has(id)) continue;
      seenRef.current.add(id);
      const h = e.get(HexPosition);
      if (!h) continue;
      const w = axialToWorld(h.q, h.r);
      if (!added) added = [];
      added.push({
        id: nextIdRef.current++,
        x: w.x,
        y: h.level * TILE_HEIGHT + 0.4,
        z: w.z,
        age: 0,
      });
    }
    setPuffs((prev) => {
      // M_MICRO.5.8 — fast-path the common empty case before
      // allocating the map/filter chain.
      if (prev.length === 0 && !added) return prev;
      const aged = prev
        .map((p) => ({ ...p, age: p.age + delta }))
        .filter((p) => p.age < PUFF_LIFETIME);
      if (!added && aged.length === prev.length) return prev;
      return added ? [...aged, ...added] : aged;
    });
  });

  return (
    <group name="build-complete-fx">
      {puffs.map((p) => {
        const t = p.age / PUFF_LIFETIME;
        const scale = PUFF_MAX_RADIUS * (0.3 + 0.7 * t);
        const opacity = 1 - t;
        return (
          <mesh
            key={p.id}
            position={[p.x, p.y + t * 0.8, p.z]}
            scale={[scale, scale, scale]}
            geometry={puffGeo}
          >
            <meshBasicMaterial color="#e0d4b8" transparent opacity={opacity * 0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
