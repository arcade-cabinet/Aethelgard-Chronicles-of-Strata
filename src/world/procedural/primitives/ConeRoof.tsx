import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Conical roof cap — tower top. Optional finial spike on apex. */
export function ConeRoof({
  radius = 0.45,
  height = 0.5,
  position = [0, 0, 0],
  segments = 12,
  finial = false,
  material = DEFAULT_MATERIALS.roof,
  finialMaterial = DEFAULT_MATERIALS.metal,
}: {
  radius?: number;
  height?: number;
  position?: [number, number, number];
  segments?: number;
  finial?: boolean;
  material?: PrimitiveMaterial;
  finialMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[radius, height, segments]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {finial && (
        <mesh position={[0, height / 2 + 0.06, 0]} castShadow>
          <coneGeometry args={[0.025, 0.12, 6]} />
          <meshStandardMaterial {...finialMaterial} />
        </mesh>
      )}
    </group>
  );
}
