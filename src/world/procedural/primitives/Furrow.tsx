/**
 * M_V11.POLISH.PROCMESH.FURROW — patch of plowed-row earth.
 *
 * A small rectangle of N parallel raised ridges. Used on Farms to add
 * a "this place grows things" silhouette beside the building.
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

const SOIL_MATERIAL: PrimitiveMaterial = {
  ...DEFAULT_MATERIALS.wood,
  color: '#5d3a1f',
  roughness: 1,
};

const GREEN_MATERIAL: PrimitiveMaterial = {
  color: '#3d7a2b',
  roughness: 0.95,
};

export function Furrow({
  width = 0.6,
  depth = 0.35,
  rows = 5,
  position = [0, 0, 0],
  soilMaterial = SOIL_MATERIAL,
  cropMaterial = GREEN_MATERIAL,
}: {
  width?: number;
  depth?: number;
  rows?: number;
  position?: [number, number, number];
  soilMaterial?: PrimitiveMaterial;
  cropMaterial?: PrimitiveMaterial;
}) {
  const rowDepth = depth / rows;
  return (
    <group position={position}>
      <mesh position={[0, 0.005, 0]} receiveShadow>
        <boxGeometry args={[width, 0.01, depth]} />
        <meshStandardMaterial {...soilMaterial} />
      </mesh>
      {Array.from({ length: rows }, (_, i) => {
        const z = -depth / 2 + rowDepth * (i + 0.5);
        return (
          <mesh key={`row-z${z.toFixed(4)}`} position={[0, 0.022, z]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.92, 0.025, rowDepth * 0.55]} />
            <meshStandardMaterial {...cropMaterial} />
          </mesh>
        );
      })}
    </group>
  );
}
