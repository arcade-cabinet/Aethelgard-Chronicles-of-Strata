/**
 * M_V11.PROCMESH.BUILDINGS — Watchtower.
 *
 * Source-unit bbox (default args): radius 0.32, height ~1.4 (incl roof).
 * Hex-fit scale: 1.0 (cylinder fits within a hex footprint).
 *
 * Composition: round stone plinth + cylindrical tower body + gold trim
 * ring + crenellated cap + conical roof with finial + corner windows.
 */
import { ConeRoof, GoldTrim, StonePlinth, Window } from '../primitives';
import { useFactionMaterials } from '../FactionMaterialsContext';

export function Watchtower({
  radius = 0.32,
  bodyHeight = 0.9,
  position = [0, 0, 0],
}: {
  radius?: number;
  bodyHeight?: number;
  position?: [number, number, number];
}) {
  const mats = useFactionMaterials();
  return (
    <group position={position}>
      <StonePlinth
        shape="round"
        radius={radius + 0.05}
        height={0.08}
        position={[0, 0.04, 0]}
        material={mats.stone}
      />
      {/* tower body */}
      <mesh position={[0, 0.08 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.02, bodyHeight, 16]} />
        <meshStandardMaterial {...mats.stone} />
      </mesh>
      <GoldTrim
        shape="ring"
        radius={radius * 1.04}
        thickness={0.05}
        position={[0, 0.08 + bodyHeight * 0.7, 0]}
        material={mats.trim}
      />
      {/* windows around the upper body — N=4 cardinal */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle) => (
        <Window
          key={angle}
          width={0.12}
          height={0.18}
          depth={0.05}
          position={[
            Math.sin(angle) * (radius + 0.02),
            0.08 + bodyHeight * 0.55,
            Math.cos(angle) * (radius + 0.02),
          ]}
          rotationY={angle}
          muntins={false}
          frameMaterial={mats.wood}
          glassMaterial={mats.glass}
        />
      ))}
      {/* crenellated cap ring (square blocks around perimeter) */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.sin(angle) * (radius + 0.01),
              0.08 + bodyHeight + 0.08,
              Math.cos(angle) * (radius + 0.01),
            ]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.1, 0.16, 0.1]} />
            <meshStandardMaterial {...mats.stone} />
          </mesh>
        );
      })}
      {/* conical roof + finial */}
      <ConeRoof
        radius={radius + 0.05}
        height={0.4}
        position={[0, 0.08 + bodyHeight + 0.36, 0]}
        finial
        material={mats.roof}
        finialMaterial={mats.trim}
      />
    </group>
  );
}
