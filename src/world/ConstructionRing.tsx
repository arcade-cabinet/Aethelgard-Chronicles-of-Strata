import { RingGeometry } from 'three';
import { HEX_RADIUS } from '@/config/world';

/**
 * Construction-progress ring (M_CONSTRUCTION.1). Floats above an in-progress
 * build site; the ring "fills" from 0° to 360° as `progress` rises from 0 to
 * 1. Combined with the scaffold-stub the building already renders as
 * (half-scale via HomeBase), gives the player Warcraft-style construction
 * feedback per the original conversation spec.
 *
 * The ring is rendered as a thin annular sweep using RingGeometry's
 * thetaLength parameter — no shader, one draw call per site.
 */
export function ConstructionRing({
  x,
  y,
  z,
  progress,
}: {
  x: number;
  y: number;
  z: number;
  /** [0, 1] construction completion fraction. */
  progress: number;
}) {
  if (progress >= 1) return null;
  const theta = Math.max(0.01, progress) * Math.PI * 2;
  // a new RingGeometry every render is fine — these are tiny (24 segments)
  // and only one per active build site (typically <5 on-screen).
  const geo = new RingGeometry(HEX_RADIUS * 0.55, HEX_RADIUS * 0.75, 24, 1, 0, theta);
  return (
    <group position={[x, y + 1.6, z]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* outer dimmed track (full circle) */}
      <mesh>
        <ringGeometry args={[HEX_RADIUS * 0.55, HEX_RADIUS * 0.75, 24]} />
        <meshBasicMaterial color="#111827" transparent opacity={0.4} />
      </mesh>
      {/* progress sweep — gold */}
      <mesh geometry={geo}>
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}
