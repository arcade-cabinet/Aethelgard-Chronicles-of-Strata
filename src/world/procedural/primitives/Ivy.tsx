/**
 * M_V11.POLISH.PROCMESH.IVY — vertical green creeper strip.
 *
 * Two stacked thin green strips with slight horizontal offsets so it
 * reads as growing vine. Hung on walls for aged-castle feel.
 */
import type { PrimitiveMaterial } from './types';

const IVY_GREEN: PrimitiveMaterial = {
  color: '#3a6428',
  roughness: 0.95,
};

export function Ivy({
  height = 0.4,
  position = [0, 0, 0],
  material = IVY_GREEN,
}: {
  height?: number;
  position?: [number, number, number];
  material?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.04, height, 0.01]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0.02, height * 0.3, 0]} castShadow>
        <boxGeometry args={[0.022, height * 0.45, 0.01]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[-0.018, height * 0.65, 0]} castShadow>
        <boxGeometry args={[0.018, height * 0.3, 0.01]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}
