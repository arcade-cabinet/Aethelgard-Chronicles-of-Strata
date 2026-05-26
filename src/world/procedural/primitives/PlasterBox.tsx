/**
 * M_V11.POLISH.PROCMESH.PLASTERBOX — generic rectangular building body.
 *
 * Wraps boxGeometry so building compositions stay primitive-only and
 * don't drop down to raw <mesh>+<boxGeometry>+<meshStandardMaterial>
 * inline. Used as the main wall body of Farm / House / Barracks where
 * the visible material is plaster/wood/stone with a flat finish.
 *
 * (Extracted per CodeRabbit review on PR #89: "Keep building geometry
 * primitive-only in this layer.")
 */
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

export function PlasterBox({
  width = 1,
  height = 0.5,
  depth = 1,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.stone,
}: {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
}) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
