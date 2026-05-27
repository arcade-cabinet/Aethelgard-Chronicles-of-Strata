/**
 * M_V11.PROCMESH.BUILDINGS + M_V11.POLISH.PROCMESH.WATCHTOWER-IDENTITY —
 * Watchtower (defensive military lookout).
 *
 * Source-unit bbox (default args): radius 0.32, height ~1.6 (incl roof+flag).
 * Hex-fit scale: 1.0.
 *
 * Identity props: TAPERED body (Kenney-style — top is narrower than
 * base), ring of arrow slits at mid-level, crenellated walkway cap,
 * conical roof, finial, and a Flag on top.
 *
 * Composition: round stone plinth + tapered cylindrical body +
 * arrow-slit ring + corner windows + gold band + crenellated cap +
 * conical roof + flag on top.
 */
import { ArrowSlit, ConeRoof, Flag, GoldTrim, StonePlinth, Window } from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Watchtower({
  baseRadius = 0.34,
  topRadius = 0.26,
  bodyHeight = 0.95,
  position = [0, 0, 0],
}: {
  baseRadius?: number;
  topRadius?: number;
  bodyHeight?: number;
  position?: [number, number, number];
}) {
  const mats = useFactionMaterials();
  // Mid-radius for the arrow-slit ring.
  const midRadius = baseRadius - (baseRadius - topRadius) * 0.4;
  return (
    <group position={position}>
      <StonePlinth
        shape="round"
        radius={baseRadius + 0.06}
        height={0.08}
        position={[0, 0.04, 0]}
        material={mats.stone}
      />
      {/* Tapered tower body — bottom wider than top. */}
      <mesh position={[0, 0.08 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[topRadius, baseRadius, bodyHeight, 18]} />
        <meshStandardMaterial {...mats.stone} />
      </mesh>
      {/* Low ring of arrow slits (defensive). */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <ArrowSlit
            key={`slit-${i}`}
            height={0.18}
            width={0.035}
            position={[
              Math.sin(angle) * (midRadius + 0.01),
              0.08 + bodyHeight * 0.34,
              Math.cos(angle) * (midRadius + 0.01),
            ]}
            material={mats.dark}
          />
        );
      })}
      {/* Upper-level windows — N=4 cardinal. */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => (
        <Window
          key={angle}
          width={0.1}
          height={0.16}
          depth={0.05}
          position={[
            Math.sin(angle) * (topRadius + 0.015),
            0.08 + bodyHeight * 0.72,
            Math.cos(angle) * (topRadius + 0.015),
          ]}
          rotationY={angle}
          muntins={false}
          frameMaterial={mats.wood}
          glassMaterial={mats.glass}
        />
      ))}
      <GoldTrim
        shape="ring"
        radius={topRadius * 1.04}
        thickness={0.04}
        position={[0, 0.08 + bodyHeight - 0.05, 0]}
        material={mats.trim}
      />
      {/* Crenellated walkway cap. */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <mesh
            key={`crenel-${angle.toFixed(3)}`}
            position={[
              Math.sin(angle) * (topRadius + 0.02),
              0.08 + bodyHeight + 0.06,
              Math.cos(angle) * (topRadius + 0.02),
            ]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.12, 0.08]} />
            <meshStandardMaterial {...mats.stone} />
          </mesh>
        );
      })}
      <ConeRoof
        radius={topRadius + 0.05}
        height={0.4}
        position={[0, 0.08 + bodyHeight + 0.34, 0]}
        finial
        material={mats.roof}
        finialMaterial={mats.trim}
      />
      {/* Flag flying from the roof peak. */}
      <Flag
        poleHeight={0.28}
        pennantLength={0.14}
        pennantHeight={0.09}
        position={[0, 0.08 + bodyHeight + 0.78, 0]}
        poleMaterial={mats.dark}
        pennantMaterial={mats.banner}
      />
    </group>
  );
}
