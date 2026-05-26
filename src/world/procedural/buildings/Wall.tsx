/**
 * M_V11.PROCMESH.BUILDINGS — Wall segment.
 *
 * Source-unit bbox (default args): width 1.0, height 0.5, depth 0.18.
 * Hex-fit scale: 1.0 (one wall segment fits one hex edge).
 *
 * Composition: stone footing course + N stacked stone bricks + banner
 * on the centre face. Battlement row caps the top.
 */
import { BattlementRow, Banner, StoneBrick, StonePlinth } from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Wall({
  length = 1.0,
  height = 0.5,
  depth = 0.18,
  position = [0, 0, 0],
  rotationY = 0,
  withBanner = false,
}: {
  length?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotationY?: number;
  withBanner?: boolean;
}) {
  const mats = useFactionMaterials();
  const brickHeight = 0.16;
  const brickWidth = 0.22;
  const courses = Math.max(2, Math.floor(height / brickHeight));
  const bricksPerCourse = Math.max(2, Math.floor(length / brickWidth));
  const actualBrickWidth = length / bricksPerCourse;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <StonePlinth
        width={length + 0.08}
        depth={depth + 0.08}
        height={0.08}
        position={[0, 0.04, 0]}
        material={mats.stone}
      />
      {Array.from({ length: courses }, (_, c) =>
        Array.from({ length: bricksPerCourse }, (_, b) => {
          const xOffset = c % 2 === 0 ? 0 : actualBrickWidth / 2;
          const x = -length / 2 + actualBrickWidth / 2 + b * actualBrickWidth + xOffset;
          if (x > length / 2) return null;
          return (
            <StoneBrick
              key={`${c}-${b}`}
              width={actualBrickWidth - 0.01}
              height={brickHeight - 0.005}
              depth={depth}
              position={[x, 0.08 + brickHeight / 2 + c * brickHeight, 0]}
              material={mats.stone}
            />
          );
        }),
      )}
      <BattlementRow
        count={Math.max(3, Math.floor(length / 0.2))}
        length={length}
        position={[0, 0.08 + courses * brickHeight + 0.09, 0]}
        material={mats.stone}
      />
      {withBanner && (
        <Banner
          width={0.28}
          height={0.42}
          position={[0, height * 0.55, depth / 2 + 0.012]}
          material={mats.banner}
        />
      )}
    </group>
  );
}
