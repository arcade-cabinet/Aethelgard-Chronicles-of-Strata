import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Stone plinth — boxy foundation slab under a building. The default
 *  shape is wider than tall (footprint × thickness), which reads as
 *  "stone footing course."
 *
 *  Use `radius`+`shape:'round'` for cylindrical plinths (under towers).
 */
export function StonePlinth({
  width = 1.1,
  depth = 1.1,
  height = 0.12,
  position = [0, 0, 0],
  shape = 'box',
  radius,
  material = DEFAULT_MATERIALS.stone,
}: {
  width?: number;
  depth?: number;
  height?: number;
  position?: [number, number, number];
  shape?: 'box' | 'round';
  radius?: number;
  material?: PrimitiveMaterial;
}) {
  if (shape === 'round') {
    const r = radius ?? Math.max(width, depth) / 2;
    return (
      <mesh position={position} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, height, 16]} />
        <meshStandardMaterial {...material} />
      </mesh>
    );
  }
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
