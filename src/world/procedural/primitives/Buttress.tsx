import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Flying / wall buttress — angled support for a high wall. Implemented
 *  as a slanted box leaning into the wall at the configured angle.
 *  Positive `lean` tilts the top toward +X (wall-side); negative tilts
 *  away. The wall composer mounts these in pairs along the long side.
 */
export function Buttress({
  height = 0.6,
  width = 0.12,
  depth = 0.08,
  lean = 0.18,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.stone,
}: {
  height?: number;
  width?: number;
  depth?: number;
  lean?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
}) {
  return (
    <mesh
      position={position}
      rotation={[0, rotationY, lean]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
