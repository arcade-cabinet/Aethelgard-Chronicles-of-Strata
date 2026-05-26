/**
 * M_V11.POLISH.PROCMESH.TREE — small low-poly tree (trunk + 2 leafy
 * stacked cones).
 *
 * Reference: Kenney Castle Kit ships scattered evergreen trees around
 * its buildings — they're what makes the scene feel like a settled
 * place rather than a museum display. Used as ambient prop around
 * Farms, Houses, Walls, Library.
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

const LEAF_GREEN: PrimitiveMaterial = {
  color: '#2f6b3c',
  roughness: 0.92,
};

const TRUNK: PrimitiveMaterial = {
  ...DEFAULT_MATERIALS.wood,
  color: '#5a3a1f',
  roughness: 0.95,
};

export function Tree({
  height = 0.42,
  position = [0, 0, 0],
  leafMaterial = LEAF_GREEN,
  trunkMaterial = TRUNK,
}: {
  height?: number;
  position?: [number, number, number];
  leafMaterial?: PrimitiveMaterial;
  trunkMaterial?: PrimitiveMaterial;
}) {
  const trunkH = height * 0.3;
  return (
    <group position={position}>
      <mesh position={[0, trunkH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.022, 0.026, trunkH, 8]} />
        <meshStandardMaterial {...trunkMaterial} />
      </mesh>
      <mesh position={[0, trunkH + height * 0.18, 0]} castShadow>
        <coneGeometry args={[height * 0.22, height * 0.4, 8]} />
        <meshStandardMaterial {...leafMaterial} />
      </mesh>
      <mesh position={[0, trunkH + height * 0.45, 0]} castShadow>
        <coneGeometry args={[height * 0.17, height * 0.32, 8]} />
        <meshStandardMaterial {...leafMaterial} />
      </mesh>
      <mesh position={[0, trunkH + height * 0.68, 0]} castShadow>
        <coneGeometry args={[height * 0.1, height * 0.22, 8]} />
        <meshStandardMaterial {...leafMaterial} />
      </mesh>
    </group>
  );
}
