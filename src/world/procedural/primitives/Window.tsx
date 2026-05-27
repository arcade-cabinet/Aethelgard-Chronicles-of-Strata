import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Window — frame + emissive pane + optional cross muntins. The frame
 *  reads as "wood / stone" via the frameMaterial; the pane glows so a
 *  building reads as "occupied" at night.
 */
export function Window({
  width = 0.2,
  height = 0.3,
  depth = 0.04,
  position = [0, 0, 0],
  rotationY = 0,
  muntins = true,
  frameMaterial = DEFAULT_MATERIALS.wood,
  glassMaterial = DEFAULT_MATERIALS.glass,
}: {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotationY?: number;
  muntins?: boolean;
  frameMaterial?: PrimitiveMaterial;
  glassMaterial?: PrimitiveMaterial;
}) {
  const frameThickness = 0.025;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* glass pane (mounted slightly behind the frame face) */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[width - frameThickness, height - frameThickness, depth * 0.5]} />
        <meshStandardMaterial {...glassMaterial} />
      </mesh>
      {/* frame */}
      <mesh position={[-width / 2 + frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, height, depth]} />
        <meshStandardMaterial {...frameMaterial} />
      </mesh>
      <mesh position={[width / 2 - frameThickness / 2, 0, 0]} castShadow>
        <boxGeometry args={[frameThickness, height, depth]} />
        <meshStandardMaterial {...frameMaterial} />
      </mesh>
      <mesh position={[0, height / 2 - frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, frameThickness, depth]} />
        <meshStandardMaterial {...frameMaterial} />
      </mesh>
      <mesh position={[0, -height / 2 + frameThickness / 2, 0]} castShadow>
        <boxGeometry args={[width, frameThickness, depth]} />
        <meshStandardMaterial {...frameMaterial} />
      </mesh>
      {muntins && (
        <>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[frameThickness * 0.6, height, depth]} />
            <meshStandardMaterial {...frameMaterial} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[width, frameThickness * 0.6, depth]} />
            <meshStandardMaterial {...frameMaterial} />
          </mesh>
        </>
      )}
    </group>
  );
}
