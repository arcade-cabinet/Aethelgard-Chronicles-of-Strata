import { useMemo } from 'react';
import { Object3D, Vector3 } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import type { BoardData } from '@/core/board';
import { axialToWorld } from '@/core/hex';

/** A placed ramp's rendering transform. */
interface RampPlacement {
  /** Stable React key. */
  key: string;
  /** Midpoint world position of the plank. */
  position: [number, number, number];
  /** Quaternion (x,y,z,w) orienting the plank's +Z up the slope. */
  quaternion: [number, number, number, number];
  /** Length of the plank along the slope. */
  slopeLength: number;
}

/** Parse a `"q,r"` hex key into a numeric pair. */
function parseKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

/** Reused scratch object — its `lookAt` yields the plank orientation. */
const scratch = new Object3D();

/**
 * Wooden ramps connecting a tile to its one-level-higher neighbour — a sloped
 * plank with side rails bridging the cliff between the two tile tops.
 *
 * The plank runs endpoint-to-endpoint from the low tile's top centre to the
 * high tile's top centre. `Object3D.lookAt` aims the plank's local +Z straight
 * at the high endpoint (combining heading + pitch); the quaternion is passed
 * to r3f directly, with no Euler round-trip.
 */
export function Ramps({ board }: { board: BoardData }) {
  const ramps = useMemo<RampPlacement[]>(() => {
    const out: RampPlacement[] = [];
    for (const ramp of board.ramps.values()) {
      const low = parseKey(ramp.lowKey);
      const high = parseKey(ramp.highKey);
      const lowTile = board.tiles.get(ramp.lowKey);
      const highTile = board.tiles.get(ramp.highKey);
      if (!lowTile || !highTile) continue;

      const lowPos = axialToWorld(low.q, low.r);
      const highPos = axialToWorld(high.q, high.r);
      const lowEnd = new Vector3(lowPos.x, lowTile.level * TILE_HEIGHT, lowPos.z);
      const highEnd = new Vector3(highPos.x, highTile.level * TILE_HEIGHT, highPos.z);

      const mid = lowEnd.clone().add(highEnd).multiplyScalar(0.5);
      const slopeLength = lowEnd.distanceTo(highEnd);

      // aim +Z at the high endpoint — one transform for heading + pitch
      scratch.position.copy(mid);
      scratch.lookAt(highEnd);
      scratch.updateMatrix();
      const q = scratch.quaternion;

      out.push({
        key: `${ramp.lowKey}->${ramp.highKey}`,
        position: [mid.x, mid.y, mid.z],
        quaternion: [q.x, q.y, q.z, q.w],
        slopeLength,
      });
    }
    return out;
  }, [board]);

  return (
    <group name="ramps">
      {ramps.map((r) => (
        <group key={r.key} position={r.position} quaternion={r.quaternion}>
          {/* sloped plank — long axis on local +Z, lifted clear of the cliff */}
          <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[HEX_RADIUS * 0.85, 0.16, r.slopeLength]} />
            <meshStandardMaterial color="#92400e" flatShading roughness={0.95} />
          </mesh>
          {/* side rails running the plank length */}
          {[HEX_RADIUS * 0.4, -HEX_RADIUS * 0.4].map((railX) => (
            <mesh key={railX} position={[railX, 0.24, 0]} castShadow>
              <boxGeometry args={[0.1, 0.22, r.slopeLength]} />
              <meshStandardMaterial color="#78350f" flatShading roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
