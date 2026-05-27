import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Spire — tall thin cone + base ring + finial ball. Used on temples,
 *  the Wonder, library cupolas.
 */
export function Spire({
  height = 0.6,
  radius = 0.08,
  position = [0, 0, 0],
  finialBall = true,
  material = DEFAULT_MATERIALS.roof,
  trimMaterial = DEFAULT_MATERIALS.trim,
}: {
  height?: number;
  radius?: number;
  position?: [number, number, number];
  finialBall?: boolean;
  material?: PrimitiveMaterial;
  trimMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      {/* base ring */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.4, radius * 1.4, 0.06, 12]} />
        <meshStandardMaterial {...trimMaterial} />
      </mesh>
      {/* spike */}
      <mesh position={[0, 0.06 + height / 2, 0]} castShadow>
        <coneGeometry args={[radius, height, 8]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {finialBall && (
        <mesh position={[0, 0.06 + height + 0.05, 0]} castShadow>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial {...trimMaterial} />
        </mesh>
      )}
    </group>
  );
}
