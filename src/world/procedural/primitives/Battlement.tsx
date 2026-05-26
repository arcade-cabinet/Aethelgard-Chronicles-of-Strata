import { DEFAULT_MATERIALS, type PrimitiveMaterial } from './types';

/** Single crenellation block. Building composers array these around a
 *  perimeter for castle-y "tooth" detail.
 *
 *  For convenience, BattlementRow lays out N blocks along a line.
 */
export function Battlement({
  width = 0.12,
  height = 0.18,
  depth = 0.12,
  position = [0, 0, 0],
  material = DEFAULT_MATERIALS.stone,
}: {
  width?: number;
  height?: number;
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

/** Row of battlements along the X axis, evenly spaced with a gap between. */
export function BattlementRow({
  count = 5,
  length = 1,
  blockWidth = 0.12,
  blockHeight = 0.18,
  blockDepth = 0.12,
  position = [0, 0, 0],
  rotationY = 0,
  material = DEFAULT_MATERIALS.stone,
}: {
  count?: number;
  length?: number;
  blockWidth?: number;
  blockHeight?: number;
  blockDepth?: number;
  position?: [number, number, number];
  rotationY?: number;
  material?: PrimitiveMaterial;
}) {
  const start = -length / 2 + blockWidth / 2;
  const step = count > 1 ? (length - blockWidth) / (count - 1) : 0;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <Battlement
          key={i}
          width={blockWidth}
          height={blockHeight}
          depth={blockDepth}
          position={[start + i * step, 0, 0]}
          material={material}
        />
      ))}
    </group>
  );
}
