/**
 * M_V11.PROCMESH.BUILDINGS + M_V11.POLISH.PROCMESH.FARM-IDENTITY —
 * Farm (small civic + agricultural).
 *
 * Source-unit bbox: width 1.3 (incl silo+field), depth 1.1, height ~0.7.
 * Hex-fit scale: 0.85 (slightly oversize footprint, scaled down to fit
 * one hex; the silo + field push it past one tile so the composition
 * gets squeezed).
 *
 * The Farm reads as 'farm' (not 'house') via three identifying props:
 *  - attached short Silo (right side)
 *  - Furrow plot of green crops (left side)
 *  - HayStack outside the door
 *
 * Composition: stone plinth + low wood body + pitched roof + chimney +
 * door + window + silo + hay + furrow.
 */
import {
  Chimney,
  Door,
  Furrow,
  HayStack,
  PitchedRoof,
  Silo,
  StonePlinth,
  Window,
} from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Farm({
  width = 0.7,
  depth = 0.85,
  bodyHeight = 0.4,
  position = [0, 0, 0],
}: {
  width?: number;
  depth?: number;
  bodyHeight?: number;
  position?: [number, number, number];
}) {
  const mats = useFactionMaterials();
  return (
    <group position={position}>
      <StonePlinth
        width={width + 0.06}
        depth={depth + 0.06}
        height={0.06}
        position={[0, 0.03, 0]}
        material={mats.stone}
      />
      <mesh position={[0, 0.06 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyHeight, depth]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      <PitchedRoof
        width={width + 0.08}
        length={depth + 0.08}
        ridgeHeight={0.26}
        position={[0, 0.06 + bodyHeight + 0.02, 0]}
        material={mats.roof}
      />
      <Chimney
        width={0.08}
        height={0.28}
        depth={0.08}
        position={[width / 3, 0.06 + bodyHeight, depth / 4]}
        material={mats.stone}
        capMaterial={mats.dark}
      />
      <Door
        width={0.16}
        height={0.28}
        position={[0, 0.06 + 0.14, depth / 2 + 0.03]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
      <Window
        width={0.12}
        height={0.12}
        position={[width / 3, 0.06 + bodyHeight * 0.7, depth / 2 + 0.03]}
        frameMaterial={mats.wood}
        glassMaterial={mats.glass}
      />
      {/* Attached grain silo on the +X side. */}
      <Silo
        height={0.55}
        radius={0.14}
        position={[width / 2 + 0.18, 0, -depth / 6]}
        bodyMaterial={mats.stone}
        capMaterial={mats.roof}
      />
      {/* HayStack outside the door. */}
      <HayStack height={0.22} radius={0.12} position={[-width / 4, 0, depth / 2 + 0.18]} />
      {/* Furrowed crop plot on the -X side. */}
      <Furrow width={0.42} depth={0.55} rows={4} position={[-width / 2 - 0.27, 0, 0]} />
    </group>
  );
}
