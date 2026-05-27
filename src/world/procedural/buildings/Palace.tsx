/**
 * M_V11.PROCMESH.BUILDINGS — Palace (hero building).
 *
 * Source-unit bbox (default args): width 1.25, depth 1.1, height ~1.5
 * (incl spire). Hex-fit scale: 1.0 (this is the centre tile).
 *
 * Composition: large stone plinth + 4 facade columns + stone body +
 * pitched roof + central spire + faction banner + emissive windows +
 * grand door + decorative gold trim band + flanking shields.
 */
import {
  Banner,
  BattlementRow,
  Column,
  Door,
  Flag,
  GoldTrim,
  PitchedRoof,
  PlasterBox,
  Shield,
  Spire,
  StonePlinth,
  Window,
} from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Palace({
  width = 1.25,
  depth = 1.1,
  bodyHeight = 0.75,
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
        width={width + 0.18}
        depth={depth + 0.18}
        height={0.12}
        position={[0, 0.06, 0]}
        material={mats.stone}
      />
      {/* second plinth tier */}
      <StonePlinth
        width={width + 0.06}
        depth={depth + 0.06}
        height={0.06}
        position={[0, 0.15, 0]}
        material={mats.stone}
      />
      <PlasterBox
        width={width}
        height={bodyHeight}
        depth={depth}
        position={[0, 0.18 + bodyHeight / 2, 0]}
        material={mats.stone}
      />
      {/* gold trim band around the upper body */}
      <GoldTrim
        shape="strip"
        width={width + 0.02}
        thickness={0.04}
        depth={depth + 0.02}
        position={[0, 0.18 + bodyHeight * 0.78, 0]}
        material={mats.trim}
      />
      {/* Engaged facade columns — half-embedded in the +Z wall so they
          read as architectural, not decorative pillars floating in
          front of the building. */}
      {[-width * 0.36, -width * 0.12, width * 0.12, width * 0.36].map((x) => (
        <Column
          key={x}
          height={bodyHeight}
          radius={0.08}
          position={[x, 0.18, depth / 2 - 0.04]}
          fluted
          fluteCount={6}
          capital
          base
          material={mats.accent}
        />
      ))}
      {/* roof — pitched */}
      <PitchedRoof
        width={width + 0.18}
        length={depth + 0.12}
        ridgeHeight={0.36}
        position={[0, 0.18 + bodyHeight + 0.04, 0]}
        material={mats.roof}
      />
      {/* Small clocktower turret on the -X end of the roof — Palace's
          unique silhouette marker. A short stone cylinder cap'd with a
          conical roof and a Flag, set offset from the central spire. */}
      <group position={[-width * 0.34, 0.18 + bodyHeight + 0.04, 0]}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.11, 0.36, 12]} />
          <meshStandardMaterial {...mats.stone} />
        </mesh>
        {/* gold ring around the clocktower */}
        <GoldTrim
          shape="ring"
          radius={0.115}
          thickness={0.025}
          position={[0, 0.32, 0]}
          material={mats.trim}
        />
        {/* dark clock face */}
        <mesh position={[0, 0.28, 0.111]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.012, 16]} />
          <meshStandardMaterial
            color="#1a1410"
            emissive={mats.trim.color ?? '#e4b54b'}
            emissiveIntensity={0.6}
          />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <coneGeometry args={[0.13, 0.22, 12]} />
          <meshStandardMaterial {...mats.roof} />
        </mesh>
        <Flag
          poleHeight={0.16}
          pennantLength={0.08}
          pennantHeight={0.06}
          position={[0, 0.54, 0]}
          poleMaterial={mats.dark}
          pennantMaterial={mats.banner}
        />
      </group>
      {/* central spire on roof ridge */}
      <Spire
        height={0.45}
        radius={0.06}
        position={[0, 0.18 + bodyHeight + 0.42, 0]}
        finialBall
        material={mats.roof}
        trimMaterial={mats.trim}
      />
      {/* battlements along the eave line (subtle martial detail) */}
      <BattlementRow
        count={6}
        length={width + 0.1}
        blockWidth={0.09}
        blockHeight={0.1}
        blockDepth={0.09}
        position={[0, 0.18 + bodyHeight + 0.06, depth / 2 + 0.03]}
        material={mats.stone}
      />
      {/* grand door (central) */}
      <Door
        width={0.3}
        height={0.5}
        depth={0.06}
        position={[0, 0.18 + 0.26, depth / 2 + 0.025]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
      {/* two emissive windows above the door */}
      <Window
        width={0.16}
        height={0.22}
        depth={0.05}
        position={[-width / 3.5, 0.18 + bodyHeight * 0.75, depth / 2 + 0.03]}
        frameMaterial={mats.accent}
        glassMaterial={mats.glass}
      />
      <Window
        width={0.16}
        height={0.22}
        depth={0.05}
        position={[width / 3.5, 0.18 + bodyHeight * 0.75, depth / 2 + 0.03]}
        frameMaterial={mats.accent}
        glassMaterial={mats.glass}
      />
      {/* flanking shields on left + right walls */}
      <Shield
        shape="round"
        size={0.22}
        position={[-width / 2 - 0.02, 0.18 + bodyHeight / 2, 0]}
        rotationY={-Math.PI / 2}
        faceMaterial={mats.banner}
        bossMaterial={mats.trim}
      />
      <Shield
        shape="round"
        size={0.22}
        position={[width / 2 + 0.02, 0.18 + bodyHeight / 2, 0]}
        rotationY={Math.PI / 2}
        faceMaterial={mats.banner}
        bossMaterial={mats.trim}
      />
      {/* two banners hanging from the eave on the facade */}
      <Banner
        width={0.18}
        height={0.4}
        position={[-width / 4, 0.18 + bodyHeight - 0.05, depth / 2 + 0.04]}
        material={mats.banner}
      />
      <Banner
        width={0.18}
        height={0.4}
        position={[width / 4, 0.18 + bodyHeight - 0.05, depth / 2 + 0.04]}
        material={mats.banner}
      />
    </group>
  );
}
