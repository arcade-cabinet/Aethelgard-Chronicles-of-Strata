/**
 * M_V11.POLISH.PROCMESH.ARROWSLIT — narrow vertical defensive window.
 *
 * Two thin recessed planes forming a + cross — a flat dark inset.
 * Embedded into walls so a Wall reads as castle-defensive.
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

export function ArrowSlit({
  height = 0.18,
  width = 0.04,
  position = [0, 0, 0],
  material = DEFAULT_MATERIALS.dark,
}: {
  height?: number;
  width?: number;
  position?: [number, number, number];
  material?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.012]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[width * 1.8, height * 0.28, 0.012]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}
