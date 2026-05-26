import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** A single stone brick block. Compose into walls with N×StoneBrick or
 *  use individually as a coping stone / step.
 */
export function StoneBrick({
  width = 0.3,
  height = 0.18,
  depth = 0.18,
  position = [0, 0, 0],
  material = DEFAULT_MATERIALS.stone,
}: {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  material?: PrimitiveMaterial;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
