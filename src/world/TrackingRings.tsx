import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { type Mesh, RingGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld } from '@/core/hex';

/** One animated tracking ring — a glowing hex marker that fades over ~1s. */
interface Ring {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Seconds elapsed since spawn. */
  age: number;
}

/** Public API exposed via ref so any HUD/system can drop a ring. */
export interface TrackingRingsHandle {
  /** Drop a ring at (q, r) on the board — fades over RING_LIFETIME seconds. */
  spawn(q: number, r: number): void;
}

const RING_LIFETIME = 1.0;
const RING_MAX_SCALE = 1.6;
const ringGeo = new RingGeometry(HEX_RADIUS * 0.6, HEX_RADIUS * 0.85, 24);

/**
 * Tracking ring layer (M_GAMEPLAY.5): on right-click, a glowing ring spawns
 * at the destination tile and fades over ~1s, giving the player immediate
 * "the command landed" feedback. Mounted inside the Canvas; the parent calls
 * `ref.current.spawn(q, r)` to drop one.
 */
export const TrackingRings = forwardRef<TrackingRingsHandle, { board: BoardData }>(
  function TrackingRings({ board }, ref) {
    const [rings, setRings] = useState<Ring[]>([]);
    const nextIdRef = useRef(0);
    const meshRefs = useRef<Map<number, Mesh>>(new Map());

    useImperativeHandle(
      ref,
      () => ({
        spawn(q: number, r: number) {
          const tile = board.tiles.get(`${q},${r}`);
          if (!tile) return;
          const { x, z } = axialToWorld(q, r);
          const id = nextIdRef.current++;
          setRings((prev) => [...prev, { id, x, y: tile.level * TILE_HEIGHT + 0.12, z, age: 0 }]);
        },
      }),
      [board],
    );

    useFrame((_, delta) => {
      let removedAny = false;
      const next: Ring[] = [];
      for (const r of rings) {
        const newAge = r.age + delta;
        if (newAge >= RING_LIFETIME) {
          meshRefs.current.delete(r.id);
          removedAny = true;
          continue;
        }
        const t = newAge / RING_LIFETIME;
        const mesh = meshRefs.current.get(r.id);
        if (mesh) {
          const scale = 1 + (RING_MAX_SCALE - 1) * t;
          mesh.scale.setScalar(scale);
          const mat = mesh.material as { opacity: number };
          mat.opacity = 1 - t;
        }
        next.push({ ...r, age: newAge });
      }
      if (next.length !== rings.length || removedAny) setRings(next);
    });

    return (
      <group name="tracking-rings">
        {rings.map((r) => (
          <mesh
            key={r.id}
            ref={(m) => {
              if (m) meshRefs.current.set(r.id, m);
              else meshRefs.current.delete(r.id);
            }}
            position={[r.x, r.y, r.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={ringGeo}
          >
            <meshBasicMaterial color="#38bdf8" transparent opacity={1} />
          </mesh>
        ))}
      </group>
    );
  },
);
