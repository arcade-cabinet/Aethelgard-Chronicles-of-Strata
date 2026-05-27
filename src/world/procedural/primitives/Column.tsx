import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Column — shaft + optional capital + base + optional fluting (vertical
 *  thin boxes around the shaft for a classical look).
 */
export function Column({
  height = 1.2,
  radius = 0.12,
  position = [0, 0, 0],
  fluted = false,
  fluteCount = 8,
  capital = true,
  base = true,
  material = DEFAULT_MATERIALS.stone,
}: {
  height?: number;
  radius?: number;
  position?: [number, number, number];
  fluted?: boolean;
  fluteCount?: number;
  capital?: boolean;
  base?: boolean;
  material?: PrimitiveMaterial;
}) {
  const shaftHeight = height - (capital ? 0.08 : 0) - (base ? 0.08 : 0);
  const baseY = base ? 0.04 : 0;
  return (
    <group position={position}>
      {base && (
        <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 1.25, radius * 1.25, 0.08, 12]} />
          <meshStandardMaterial {...material} />
        </mesh>
      )}
      <mesh position={[0, baseY + shaftHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, shaftHeight, 12]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {fluted &&
        Array.from({ length: fluteCount }, (_, i) => {
          const angle = (i / fluteCount) * Math.PI * 2;
          const fx = Math.cos(angle) * (radius * 0.95);
          const fz = Math.sin(angle) * (radius * 0.95);
          return (
            <mesh
              // biome-ignore lint/suspicious/noArrayIndexKey: flutes are a fixed-length deterministic loop with no reordering; index is the stable key.
              key={`flute-${i}`}
              position={[fx, baseY + shaftHeight / 2, fz]}
              rotation={[0, -angle, 0]}
              castShadow
            >
              <boxGeometry args={[0.02, shaftHeight * 0.96, 0.04]} />
              <meshStandardMaterial {...material} />
            </mesh>
          );
        })}
      {capital && (
        <mesh position={[0, baseY + shaftHeight + 0.04, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[radius * 1.35, radius * 1.1, 0.08, 12]} />
          <meshStandardMaterial {...material} />
        </mesh>
      )}
    </group>
  );
}
