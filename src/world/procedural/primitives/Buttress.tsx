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
  // Yaw FIRST, then lean in the yawed frame — nesting two groups makes
  // the rotation order explicit. (Pre-fix: a single Euler [0, rotationY,
  // lean] with the default XYZ order lean'd toward the buttress's local
  // +X *before* yawing, so side-wall buttresses tilted along the wall's
  // length instead of into the wall face. Reviewer flag B1 PR #v0.11.)
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[0, 0, lean]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}
