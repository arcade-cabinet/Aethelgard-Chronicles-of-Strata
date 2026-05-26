/**
 * M_V11.PROCMESH.BUILDINGS + M_V11.POLISH.PROCMESH.WALL-VARIANTS —
 * Wall segment with optional gate (cut a door opening in the centre)
 * + optional corner (add a perpendicular Wall plane at +Z so the
 * segment forms an L for end-of-row positions).
 *
 * Source-unit bbox (default args): width 1.0, height 0.5, depth 0.18.
 * Hex-fit scale: 1.0 (one wall segment fits one hex edge).
 *
 * Composition: stone footing course + N stacked stone bricks +
 * (optional gate: skip bricks within the door gap + place a Door
 * primitive) + (optional corner: a second perpendicular wall body)
 * + (optional banner) + battlement row cap.
 */
import { Banner, BattlementRow, Door, StoneBrick, StonePlinth } from '../primitives';
import { useFactionMaterials } from '../faction-materials';

const GATE_HALF_WIDTH = 0.18;
const GATE_OPENING_HEIGHT = 0.34;

export function Wall({
  length = 1.0,
  height = 0.5,
  depth = 0.18,
  position = [0, 0, 0],
  rotationY = 0,
  withBanner = false,
  hasGate = false,
  isCorner = false,
}: {
  length?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotationY?: number;
  withBanner?: boolean;
  /** M_EXPANSION.A.3 — render a gate opening in the centre with a
   *  Door primitive. Bricks inside the gate gap are skipped. */
  hasGate?: boolean;
  /** M_EXPANSION.A.6 — render a perpendicular wall plane at the +Z
   *  end so this segment forms an L (used for end-of-row walls). */
  isCorner?: boolean;
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
          const y = 0.08 + brickHeight / 2 + c * brickHeight;
          // M_V11.POLISH.PROCMESH.WALL-VARIANTS — skip bricks
          // inside the gate gap (full-height opening) when hasGate.
          if (hasGate && Math.abs(x) < GATE_HALF_WIDTH && y < 0.08 + GATE_OPENING_HEIGHT) {
            return null;
          }
          return (
            <StoneBrick
              key={`brick-x${x.toFixed(3)}-y${y.toFixed(3)}`}
              width={actualBrickWidth - 0.01}
              height={brickHeight - 0.005}
              depth={depth}
              position={[x, y, 0]}
              material={mats.stone}
            />
          );
        }),
      )}
      {/* Gate Door primitive in the opening */}
      {hasGate && (
        <Door
          width={GATE_HALF_WIDTH * 2 - 0.02}
          height={GATE_OPENING_HEIGHT - 0.02}
          depth={depth * 0.9}
          position={[0, 0.08 + GATE_OPENING_HEIGHT / 2, 0]}
          panelMaterial={mats.wood}
          frameMaterial={mats.dark}
          handleMaterial={mats.trim}
        />
      )}
      <BattlementRow
        count={Math.max(3, Math.floor(length / 0.2))}
        length={length}
        position={[0, 0.08 + courses * brickHeight + 0.09, 0]}
        material={mats.stone}
      />
      {/* Corner: drop a perpendicular Wall body at the +Z end so
          this segment reads as an L-bend. The perpendicular section
          is a thin brick stack (no plinth / battlements — those are
          the adjacent segment's responsibility). */}
      {isCorner &&
        Array.from({ length: courses }, (_, c) => {
          const y = 0.08 + brickHeight / 2 + c * brickHeight;
          return (
            <StoneBrick
              key={`corner-y${y.toFixed(3)}`}
              width={depth}
              height={brickHeight - 0.005}
              depth={depth * 1.4}
              position={[length / 2 - depth / 2, y, depth * 0.7]}
              material={mats.stone}
            />
          );
        })}
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
