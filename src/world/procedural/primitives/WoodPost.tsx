import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Vertical wood post / beam. Used as a corner support, flagpole shaft,
 *  scaffolding upright, or doorway jamb.
 */
export function WoodPost({
  height = 1,
  width = 0.08,
  depth = 0.08,
  position = [0, 0, 0],
  material = DEFAULT_MATERIALS.wood,
}: {
  height?: number;
  width?: number;
  depth?: number;
  position?: [number, number, number];
  material?: PrimitiveMaterial;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...material} />
    </mesh>
  );
}
