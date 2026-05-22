import { useMemo } from 'react';
import { Euler, Quaternion, Vector3 } from 'three';
import type { BoardData } from '@/core/board';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';

/** Horizontal run of a ramp between two tile centres. */
const RAMP_RUN = 1.3;

/** A placed ramp's rendering transform. */
interface RampPlacement {
  /** Stable React key. */
  key: string;
  /** Midpoint world position. */
  position: [number, number, number];
  /** Euler rotation orienting the plank low→high. */
  rotation: [number, number, number];
  /** Slope length (the plank's long dimension). */
  slopeLength: number;
}

/** Parse a `"q,r"` hex key into a numeric pair. */
function parseKey(key: string): { q: number; r: number } {
  const [q, r] = key.split(',').map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

/**
 * Wooden ramps connecting a tile to its one-level-higher neighbour — a sloped
 * plank with two side rails. Ramps are the only way units traverse elevation,
 * so they must be visible. Mirrors poc1's `buildRamp`.
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
      const lowY = lowTile.level * TILE_HEIGHT;
      const highY = highTile.level * TILE_HEIGHT;
      const midX = (lowPos.x + highPos.x) / 2;
      const midZ = (lowPos.z + highPos.z) / 2;
      const midY = (lowY + highY) / 2;
      const slopeLength = Math.hypot(RAMP_RUN, highY - lowY);

      // orient the plank's local +Z toward the high tile (poc1 used lookAt)
      const dir = new Vector3(highPos.x - midX, highY - midY, highPos.z - midZ).normalize();
      const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir);
      const euler = new Euler().setFromQuaternion(quat);

      out.push({
        key: `${ramp.lowKey}->${ramp.highKey}`,
        position: [midX, midY, midZ],
        rotation: [euler.x, euler.y, euler.z],
        slopeLength,
      });
    }
    return out;
  }, [board]);

  return (
    <group name="ramps">
      {ramps.map((r) => (
        <group key={r.key} position={r.position} rotation={r.rotation}>
          {/* sloped plank */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[HEX_RADIUS * 0.7, 0.15, r.slopeLength]} />
            <meshStandardMaterial color="#92400e" flatShading roughness={0.9} />
          </mesh>
          {/* side rails */}
          {[HEX_RADIUS * 0.35, -HEX_RADIUS * 0.35].map((railX) => (
            <mesh key={railX} position={[railX, 0.05, 0]} castShadow>
              <boxGeometry args={[0.08, 0.25, r.slopeLength]} />
              <meshStandardMaterial color="#78350f" flatShading roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
