/**
 * M_V11.POLISH.PROCMESH.SILO — short attached grain silo.
 *
 * A capped cylinder used as a distinguishing prop for the Farm building.
 * Silhouette: short cylinder body + a low cone cap. Sits on the ground
 * next to a farmhouse so the Farm reads as "farm with silo" rather than
 * "generic house".
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

export function Silo({
  height = 0.45,
  radius = 0.12,
  position = [0, 0, 0],
  bodyMaterial = DEFAULT_MATERIALS.stone,
  capMaterial = DEFAULT_MATERIALS.roof,
}: {
  height?: number;
  radius?: number;
  position?: [number, number, number];
  bodyMaterial?: PrimitiveMaterial;
  capMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.05, height, 10]} />
        <meshStandardMaterial {...bodyMaterial} />
      </mesh>
      <mesh position={[0, height + radius * 0.4, 0]} castShadow>
        <coneGeometry args={[radius * 1.05, radius * 0.8, 10]} />
        <meshStandardMaterial {...capMaterial} />
      </mesh>
    </group>
  );
}
