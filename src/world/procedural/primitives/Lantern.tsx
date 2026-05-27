/**
 * M_V11.POLISH.PROCMESH.LANTERN — small glowing lantern.
 *
 * Cube with glowing emissive material, suspended by a short bracket.
 * Hung beside doorways. Emissive so it reads as lit in shadow zones.
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

const GLASS_GLOW: PrimitiveMaterial = {
  color: '#ffd06c',
  emissive: '#ffb04a',
  emissiveIntensity: 1.4,
  metalness: 0,
  roughness: 0.2,
};

export function Lantern({
  size = 0.05,
  bracketLength = 0.08,
  position = [0, 0, 0],
  bracketMaterial = DEFAULT_MATERIALS.dark,
  glassMaterial = GLASS_GLOW,
}: {
  size?: number;
  bracketLength?: number;
  position?: [number, number, number];
  bracketMaterial?: PrimitiveMaterial;
  glassMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh position={[-bracketLength / 2, 0, 0]} castShadow>
        <boxGeometry args={[bracketLength, 0.012, 0.012]} />
        <meshStandardMaterial {...bracketMaterial} />
      </mesh>
      <mesh position={[-bracketLength, -size / 2 - 0.01, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.02, 6]} />
        <meshStandardMaterial {...bracketMaterial} />
      </mesh>
      <mesh position={[-bracketLength, -size, 0]} castShadow>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      <mesh position={[-bracketLength, -size - size / 2, 0]} castShadow>
        <coneGeometry args={[size * 0.6, size * 0.4, 6]} />
        <meshStandardMaterial {...bracketMaterial} />
      </mesh>
    </group>
  );
}
