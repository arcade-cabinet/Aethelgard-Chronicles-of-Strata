import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Shield — round or kite-shaped emblem mountable on a wall. The
 *  faceMaterial is what the Skin tints per-faction (banner family).
 */
export function Shield({
  shape = 'round',
  size = 0.25,
  thickness = 0.04,
  position = [0, 0, 0],
  rotationY = 0,
  faceMaterial = DEFAULT_MATERIALS.banner,
  bossMaterial = DEFAULT_MATERIALS.trim,
}: {
  shape?: 'round' | 'kite';
  size?: number;
  thickness?: number;
  position?: [number, number, number];
  rotationY?: number;
  faceMaterial?: PrimitiveMaterial;
  bossMaterial?: PrimitiveMaterial;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {shape === 'round' ? (
        <mesh castShadow>
          <cylinderGeometry args={[size / 2, size / 2, thickness, 16]} />
          <meshStandardMaterial {...faceMaterial} />
        </mesh>
      ) : (
        <mesh castShadow rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[size, size, thickness]} />
          <meshStandardMaterial {...faceMaterial} />
        </mesh>
      )}
      {/* central boss */}
      <mesh position={[0, 0, thickness / 2 + 0.005]} castShadow>
        <sphereGeometry args={[size * 0.12, 8, 8]} />
        <meshStandardMaterial {...bossMaterial} />
      </mesh>
    </group>
  );
}
