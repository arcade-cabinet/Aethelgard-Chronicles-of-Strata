import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Weapon rack — horizontal beam + vertical posts + N spears/swords
 *  leaning on it. Adornment for Barracks.
 */
export function WeaponRack({
  width = 0.4,
  height = 0.45,
  weaponCount = 4,
  position = [0, 0, 0],
  rotationY = 0,
  rackMaterial = DEFAULT_MATERIALS.wood,
  weaponMaterial = DEFAULT_MATERIALS.metal,
  shaftMaterial = DEFAULT_MATERIALS.wood,
}: {
  width?: number;
  height?: number;
  weaponCount?: number;
  position?: [number, number, number];
  rotationY?: number;
  rackMaterial?: PrimitiveMaterial;
  weaponMaterial?: PrimitiveMaterial;
  shaftMaterial?: PrimitiveMaterial;
}) {
  const postRadius = 0.015;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* two vertical posts */}
      <mesh position={[-width / 2, height / 2, 0]} castShadow>
        <cylinderGeometry args={[postRadius, postRadius, height, 6]} />
        <meshStandardMaterial {...rackMaterial} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} castShadow>
        <cylinderGeometry args={[postRadius, postRadius, height, 6]} />
        <meshStandardMaterial {...rackMaterial} />
      </mesh>
      {/* horizontal cross bar at chest level */}
      <mesh position={[0, height * 0.7, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[postRadius, postRadius, width, 6]} />
        <meshStandardMaterial {...rackMaterial} />
      </mesh>
      {/* N weapons leaning against the bar — spears (shaft + tip) */}
      {Array.from({ length: weaponCount }, (_, i) => {
        const t = weaponCount === 1 ? 0.5 : i / (weaponCount - 1);
        const x = -width / 2 + 0.04 + t * (width - 0.08);
        const shaftHeight = height * 0.95;
        return (
          <group
            // biome-ignore lint/suspicious/noArrayIndexKey: weapons are a fixed-length deterministic loop; index is the stable key.
            key={`weapon-${i}`}
            position={[x, 0, 0.02]}
            rotation={[0.05, 0, 0]}
          >
            <mesh position={[0, shaftHeight / 2, 0]} castShadow>
              <cylinderGeometry args={[0.008, 0.008, shaftHeight, 5]} />
              <meshStandardMaterial {...shaftMaterial} />
            </mesh>
            <mesh position={[0, shaftHeight + 0.04, 0]} castShadow>
              <coneGeometry args={[0.018, 0.08, 6]} />
              <meshStandardMaterial {...weaponMaterial} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
