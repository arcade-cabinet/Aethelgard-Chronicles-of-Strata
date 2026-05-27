/**
 * M_V11.POLISH.PROCMESH.FLAG — pennant on a pole.
 *
 * Pole stick + a triangular pennant on its top half. Hung from
 * tower tops + crow's nests. Pennant uses the building's banner
 * material so faction colour carries.
 */
import { Shape } from 'three';
import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

export function Flag({
  poleHeight = 0.32,
  pennantLength = 0.16,
  pennantHeight = 0.1,
  position = [0, 0, 0],
  poleMaterial = DEFAULT_MATERIALS.dark,
  pennantMaterial = DEFAULT_MATERIALS.banner,
}: {
  poleHeight?: number;
  pennantLength?: number;
  pennantHeight?: number;
  position?: [number, number, number];
  poleMaterial?: PrimitiveMaterial;
  pennantMaterial?: PrimitiveMaterial;
}) {
  const pennantShape = (() => {
    const s = new Shape();
    s.moveTo(0, 0);
    s.lineTo(pennantLength, pennantHeight / 2);
    s.lineTo(0, pennantHeight);
    s.closePath();
    return s;
  })();
  return (
    <group position={position}>
      <mesh position={[0, poleHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, poleHeight, 6]} />
        <meshStandardMaterial {...poleMaterial} />
      </mesh>
      <mesh
        position={[0.008, poleHeight - pennantHeight - 0.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <extrudeGeometry args={[pennantShape, { depth: 0.006, bevelEnabled: false }]} />
        <meshStandardMaterial {...pennantMaterial} side={2} />
      </mesh>
    </group>
  );
}
