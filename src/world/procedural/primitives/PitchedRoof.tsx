import { Shape } from 'three';
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Gabled / pitched roof — a triangular prism sitting atop a rectangular
 *  building. Approximated as a triangular extrude via two angled boxes
 *  meeting at the ridge.
 *
 *  Implementation: two slanted planes via boxGeometry, rotated into the
 *  pitch. Cheap, clean silhouette, no custom buffergeometry needed.
 */
export function PitchedRoof({
  width = 1,
  length = 1.2,
  ridgeHeight = 0.4,
  thickness = 0.04,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.roof,
}: {
  width?: number;
  length?: number;
  ridgeHeight?: number;
  thickness?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
}) {
  const slope = Math.atan2(ridgeHeight, width / 2);
  const half = width / 2;
  const slantLength = Math.sqrt(half * half + ridgeHeight * ridgeHeight);
  // X-offset of each slope's centre so its outer edge sits on the eave.
  const offsetX = half / 2;
  const offsetY = ridgeHeight / 2;
  // Triangular gable cap — a thin extruded triangle sealing each end of
  // the roof so the pitched roof reads as a solid prism, not two floating
  // slopes with a visible gap.
  const gableShape = (() => {
    const shape = new Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(half, 0);
    shape.lineTo(0, ridgeHeight);
    shape.closePath();
    return shape;
  })();
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* left slope */}
      <mesh position={[-offsetX, offsetY, 0]} rotation={[0, 0, -slope]} castShadow receiveShadow>
        <boxGeometry args={[slantLength, thickness, length]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {/* right slope */}
      <mesh position={[offsetX, offsetY, 0]} rotation={[0, 0, slope]} castShadow receiveShadow>
        <boxGeometry args={[slantLength, thickness, length]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {/* gable caps (front + back triangles sealing the prism) */}
      <mesh position={[0, 0, length / 2 - thickness / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[gableShape, { depth: thickness, bevelEnabled: false }]} />
        <meshStandardMaterial {...material} />
      </mesh>
      <mesh position={[0, 0, -length / 2 - thickness / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[gableShape, { depth: thickness, bevelEnabled: false }]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}
