import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Chimney — stack of stone bricks with an optional smoke vent cap. */
export function Chimney({
  width = 0.14,
  height = 0.5,
  depth = 0.14,
  position = [0, 0, 0],
  cap = true,
  material = DEFAULT_MATERIALS.stone,
  capMaterial = DEFAULT_MATERIALS.dark,
}: {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  cap?: boolean;
  material?: PrimitiveMaterial;
  capMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {cap && (
        <mesh position={[0, height + 0.02, 0]} castShadow>
          <boxGeometry args={[width * 1.1, 0.04, depth * 1.1]} />
          <meshStandardMaterial {...capMaterial} />
        </mesh>
      )}
    </group>
  );
}
