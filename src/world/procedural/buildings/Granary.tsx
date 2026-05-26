/**
 * M_V11.PROCMESH.BUILDINGS — Granary.
 *
 * Source-unit bbox: width 0.95, height ~1.1 (silo + cap).
 * Hex-fit scale: 1.0.
 *
 * Composition: stone plinth + cylindrical silo body + gold trim band
 * + conical cap + small grain door + wooden ladder (vertical box).
 * Distinctive cylindrical silhouette so the player tells food
 * production from other small buildings at a glance.
 */
import { ConeRoof, Door, GoldTrim, StonePlinth, WoodPost } from '../primitives';
import { useFactionMaterials } from '../FactionMaterialsContext';

export function Granary({
  radius = 0.36,
  bodyHeight = 0.7,
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
        height={0.07}
        position={[0, 0.035, 0]}
        material={mats.stone}
      />
      {/* silo body */}
      <mesh position={[0, 0.07 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.05, bodyHeight, 18]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      {/* horizontal hoop bands */}
      <GoldTrim
        shape="ring"
        radius={radius * 1.04}
        thickness={0.025}
        position={[0, 0.07 + bodyHeight * 0.3, 0]}
        material={mats.trim}
      />
      <GoldTrim
        shape="ring"
        radius={radius * 1.04}
        thickness={0.025}
        position={[0, 0.07 + bodyHeight * 0.7, 0]}
        material={mats.trim}
      />
      {/* conical cap */}
      <ConeRoof
        radius={radius + 0.04}
        height={0.32}
        segments={18}
        position={[0, 0.07 + bodyHeight + 0.16, 0]}
        finial
        material={mats.roof}
        finialMaterial={mats.trim}
      />
      {/* grain door on +Z face */}
      <Door
        width={0.18}
        height={0.26}
        position={[0, 0.07 + 0.13, radius + 0.012]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
      {/* small ladder against the side */}
      <WoodPost
        height={bodyHeight}
        width={0.025}
        depth={0.04}
        position={[radius + 0.03, 0.07 + bodyHeight / 2, 0.08]}
        material={mats.dark}
      />
      <WoodPost
        height={bodyHeight}
        width={0.025}
        depth={0.04}
        position={[radius + 0.03, 0.07 + bodyHeight / 2, -0.08]}
        material={mats.dark}
      />
    </group>
  );
}
