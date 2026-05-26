/**
 * M_V11.POLISH.PROCMESH.FINIAL — decorative roof spike with a gold ball.
 *
 * Sits on top of a roof peak so the building has a unique silhouette
 * marker at the apex. Three-piece: thin spire + gold ball + tiny cap.
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

const GOLD: PrimitiveMaterial = {
  color: '#e4b54b',
  metalness: 0.85,
  roughness: 0.25,
};

export function Finial({
  height = 0.22,
  position = [0, 0, 0],
  poleMaterial = DEFAULT_MATERIALS.dark,
  orbMaterial = GOLD,
}: {
  height?: number;
  position?: [number, number, number];
  poleMaterial?: PrimitiveMaterial;
  orbMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, height, 8]} />
        <meshStandardMaterial {...poleMaterial} />
      </mesh>
      <mesh position={[0, height + 0.025, 0]} castShadow>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial {...orbMaterial} />
      </mesh>
      <mesh position={[0, height + 0.065, 0]} castShadow>
        <coneGeometry args={[0.012, 0.05, 8]} />
        <meshStandardMaterial {...orbMaterial} />
      </mesh>
    </group>
  );
}
