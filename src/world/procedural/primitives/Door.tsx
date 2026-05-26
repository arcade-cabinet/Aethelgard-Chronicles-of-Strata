import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Door — frame + panel + handle. The panel can sit flush with a wall
 *  (open=false) for closed-day reading, or rotate open later if we want
 *  to animate it. For now, static.
 */
export function Door({
  width = 0.25,
  height = 0.45,
  depth = 0.05,
  position = [0, 0, 0],
  rotationY = 0,
  panelMaterial = DEFAULT_MATERIALS.wood,
  frameMaterial = DEFAULT_MATERIALS.dark,
  handleMaterial = DEFAULT_MATERIALS.trim,
}: {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotationY?: number;
  panelMaterial?: PrimitiveMaterial;
  frameMaterial?: PrimitiveMaterial;
  handleMaterial?: PrimitiveMaterial;
}) {
  const frameWidth = 0.03;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* frame outline (behind panel so it shows as a border) */}
      <mesh position={[0, 0, -0.005]} castShadow receiveShadow>
        <boxGeometry args={[width + frameWidth * 2, height + frameWidth * 2, depth * 0.6]} />
        <meshStandardMaterial {...frameMaterial} />
      </mesh>
      {/* panel */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial {...panelMaterial} />
      </mesh>
      {/* handle — small sphere on the right */}
      <mesh position={[width / 2 - 0.04, 0, depth / 2 + 0.012]} castShadow>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial {...handleMaterial} />
      </mesh>
    </group>
  );
}
