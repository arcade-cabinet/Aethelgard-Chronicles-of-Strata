import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { RingGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld } from '@/core/hex';

/**
 * One animated tracking ring — a glowing hex marker that fades over ~1s.
 *
 * M_MICRO.3.2 — opacity + scale now live ON the ring object (state),
 * not on a ref Map keyed by id. The previous shape rendered the first
 * frame at opacity={1} before useFrame fired the per-ref mutation,
 * producing a 1-frame opacity pop. With state-owned animation values
 * the first paint reads the correct fade.
 */
interface Ring {
  id: number;
  x: number;
  y: number;
  z: number;
  /** Seconds elapsed since spawn. */
  age: number;
  /** Current opacity (1 → 0 over RING_LIFETIME). */
  opacity: number;
  /** Current scale (1 → RING_MAX_SCALE over RING_LIFETIME). */
  scale: number;
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

    useImperativeHandle(
      ref,
      () => ({
        spawn(q: number, r: number) {
          const tile = board.tiles.get(`${q},${r}`);
          if (!tile) return;
          const { x, z } = axialToWorld(q, r);
          const id = nextIdRef.current++;
          setRings((prev) => [
            ...prev,
            {
              id,
              x,
              y: tile.level * TILE_HEIGHT + 0.12,
              z,
              age: 0,
              opacity: 1,
              scale: 1,
            },
          ]);
        },
      }),
      [board],
    );

    useFrame((_, delta) => {
      setRings((prev) => {
        if (prev.length === 0) return prev;
        const next: Ring[] = [];
        let removedAny = false;
        for (const r of prev) {
          const newAge = r.age + delta;
          if (newAge >= RING_LIFETIME) {
            removedAny = true;
            continue;
          }
          const t = newAge / RING_LIFETIME;
          next.push({
            ...r,
            age: newAge,
            opacity: 1 - t,
            scale: 1 + (RING_MAX_SCALE - 1) * t,
          });
        }
        if (!removedAny && next.length === prev.length) {
          // Always need to update opacity/scale even when no rings removed.
        }
        return next;
      });
    });

    return (
      <group name="tracking-rings">
        {rings.map((r) => (
          <mesh
            key={r.id}
            position={[r.x, r.y, r.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={r.scale}
            geometry={ringGeo}
          >
            <meshBasicMaterial color="#38bdf8" transparent opacity={r.opacity} />
          </mesh>
        ))}
      </group>
    );
  },
);
