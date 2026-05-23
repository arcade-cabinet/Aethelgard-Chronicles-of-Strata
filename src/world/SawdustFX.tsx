import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { ConeGeometry } from 'three';
import { unpackEntity } from 'koota';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { AssignedJob, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

/** Per-puff lifetime (seconds). */
const PUFF_LIFETIME = 0.6;
/** Spawn interval per actively-building peon. */
const PUFF_INTERVAL = 0.35;
/** Hard per-frame cap so a stampede of builders doesn't flood. */
const PER_FRAME_CAP = 4;

const sawdustGeo = new ConeGeometry(0.06, 0.12, 5);

interface Puff {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  age: number;
}

/**
 * Sawdust particles on actively-building peons (M_POLISH.2). Per BUILDING
 * peon, throttled puff spawn at PUFF_INTERVAL; each puff is a tiny gold
 * cone that ballistically drifts + fades. Pure presentation — the build
 * timer is unaffected.
 */
export function SawdustFX({ game }: { game: GameState }) {
  const accRef = useRef<Map<number, number>>(new Map());
  const nextIdRef = useRef(0);
  const [puffs, setPuffs] = useState<Puff[]>([]);

  useFrame((_, delta) => {
    const acc = accRef.current;
    const live = new Set<number>();
    let spawnedThisFrame = 0;
    const fresh: Puff[] = [];
    for (const e of game.world.query(Unit, AssignedJob, HexPosition)) {
      if (e.get(AssignedJob)?.state !== 'BUILDING') continue;
      const id = unpackEntity(e).entityId;
      live.add(id);
      const next = (acc.get(id) ?? PUFF_INTERVAL) + delta;
      if (next < PUFF_INTERVAL) {
        acc.set(id, next);
        continue;
      }
      acc.set(id, 0);
      if (spawnedThisFrame >= PER_FRAME_CAP) continue;
      const h = e.get(HexPosition);
      if (!h) continue;
      const w = axialToWorld(h.q, h.r);
      const angle = Math.random() * Math.PI * 2;
      fresh.push({
        id: nextIdRef.current++,
        x: w.x,
        y: h.level * TILE_HEIGHT + 0.5,
        z: w.z,
        vx: Math.cos(angle) * 0.6,
        vz: Math.sin(angle) * 0.6,
        age: 0,
      });
      spawnedThisFrame += 1;
    }
    // GC accumulators for vanished entities
    for (const id of acc.keys()) if (!live.has(id)) acc.delete(id);
    setPuffs((prev) => {
      const aged = prev
        .map((p) => ({ ...p, age: p.age + delta }))
        .filter((p) => p.age < PUFF_LIFETIME);
      if (fresh.length === 0 && aged.length === prev.length) return prev;
      return [...aged, ...fresh];
    });
  });

  if (puffs.length === 0) return null;
  return (
    <group name="sawdust">
      {puffs.map((p) => {
        const t = p.age / PUFF_LIFETIME;
        const x = p.x + p.vx * p.age;
        const z = p.z + p.vz * p.age;
        const y = p.y + 0.4 * t - 0.8 * t * t; // small arc
        const opacity = 1 - t;
        return (
          <mesh key={p.id} position={[x, y, z]} rotation={[0, t * 4, t * 6]} geometry={sawdustGeo}>
            <meshBasicMaterial color="#fbbf24" transparent opacity={opacity * 0.85} />
          </mesh>
        );
      })}
    </group>
  );
}
