import { DoubleSide } from 'three';
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Decorative gold band. Two shapes supported:
 *  - 'ring': cylindrical band wrapping a tower body (radius + thickness)
 *  - 'strip': thin box used as horizontal trim on a wall
 */
export function GoldTrim({
  shape = 'strip',
  width = 0.6,
  thickness = 0.04,
  depth = 0.04,
  radius = 0.4,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.trim,
}: {
  shape?: 'ring' | 'strip';
  width?: number;
  thickness?: number;
  depth?: number;
  radius?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
}) {
  if (shape === 'ring') {
    return (
      <mesh position={position} rotation={[0, rotationY, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, thickness, 24, 1, true]} />
        <meshStandardMaterial {...material} side={DoubleSide} />
      </mesh>
    );
  }
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} castShadow>
      <boxGeometry args={[width, thickness, depth]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
