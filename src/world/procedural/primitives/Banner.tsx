import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Faction banner — a flat rectangular cloth hanging from a horizontal
 *  bar at top. Renders as a thin box; the building composer mounts it
 *  on the side of a wall or under an entablature.
 */
export function Banner({
  width = 0.35,
  height = 0.55,
  thickness = 0.02,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.banner,
  // Reviewer m1 fix — was hardcoded zinc-700; honor the faction's
  // metal-family material so the banner hanger shifts per-skin.
  hangerMaterial = DEFAULT_MATERIALS.metal,
}: {
  width?: number;
  height?: number;
  thickness?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
  hangerMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* horizontal hanger bar — cylinder rotated to span X axis. */}
      <mesh position={[0, height / 2 + 0.025, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, width + 0.06, 6]} />
        <meshStandardMaterial {...hangerMaterial} />
      </mesh>
      {/* cloth panel */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[width, height, thickness]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}
