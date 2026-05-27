/**
 * M_V11.POLISH.PROCMESH.HAYSTACK — yellow cone of hay.
 *
 * Identifying prop for farms / granaries. Cone with a textured-ish
 * cylindrical wrap of three short cylinders so it doesn't look like
 * a smooth ice-cream scoop.
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

const HAY_MATERIAL: PrimitiveMaterial = {
  ...DEFAULT_MATERIALS.wood,
  color: '#d9c36a',
  roughness: 0.95,
};

export function HayStack({
  height = 0.28,
  radius = 0.16,
  position = [0, 0, 0],
  material = HAY_MATERIAL,
}: {
  height?: number;
  radius?: number;
  position?: [number, number, number];
  material?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      {/* Stacked rings of slightly-shorter cones for a tiered haystack. */}
      <mesh position={[0, height * 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height * 0.36, 10]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, height * 0.55, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.78, radius, height * 0.32, 10]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, height * 0.85, 0]} castShadow>
        <coneGeometry args={[radius * 0.78, height * 0.3, 10]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}
