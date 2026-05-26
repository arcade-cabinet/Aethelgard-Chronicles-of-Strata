import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** A horizontal log (cylinder rotated π/2 about Z so it lies along X).
 *  Used as a wall course unit, palisade segment, or roof ridge timber.
 *
 *  Geometry: cylinderGeometry(radius, radius, length, 8)
 *  Default orientation: long-axis along world-X, ends visible along ±X.
 */
export function Log({
  length = 1,
  radius = 0.08,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.wood,
}: {
  length?: number;
  radius?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
}) {
  return (
    <mesh position={position} rotation={[0, rotationY, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
