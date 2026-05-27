/**
 * M_V11.PROCMESH.BUILDINGS + M_V11.POLISH.PROCMESH.WONDER-IDENTITY —
 * Wonder (the keep / capital monument).
 *
 * Source-unit bbox: width 1.6, depth 1.6, height ~2.6 (incl spire+flags).
 * Hex-fit scale: 1.0 (Wonder is intentionally oversized vs other tiles).
 *
 * Identity: a 3-tier stepped plinth (ziggurat base), tall central keep
 * with arched windows + columns + banners, four tall corner spire-towers
 * each capped with a conical roof + flying flag, central monumental
 * spire with finial. Reads as 'the imposing capital monument' at any
 * zoom level.
 */
import {
  Banner,
  Column,
  ConeRoof,
  Flag,
  GoldTrim,
  PlasterBox,
  Shield,
  Spire,
  StonePlinth,
  Window,
} from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Wonder({
  width = 1.6,
  depth = 1.6,
  bodyHeight = 1.05,
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
      {/* 3-tier stepped plinth — ziggurat base reads as monument. */}
      <StonePlinth
        width={width + 0.3}
        depth={depth + 0.3}
        height={0.14}
        position={[0, 0.07, 0]}
        material={mats.stone}
      />
      <StonePlinth
        width={width + 0.16}
        depth={depth + 0.16}
        height={0.08}
        position={[0, 0.18, 0]}
        material={mats.stone}
      />
      <StonePlinth
        width={width + 0.04}
        depth={depth + 0.04}
        height={0.06}
        position={[0, 0.25, 0]}
        material={mats.stone}
      />
      <PlasterBox
        width={width}
        height={bodyHeight}
        depth={depth}
        position={[0, 0.28 + bodyHeight / 2, 0]}
        material={mats.stone}
      />
      {/* Gold trim — three horizontal bands. */}
      {[0.05, 0.45, 0.88].map((tFrac) => (
        <GoldTrim
          key={tFrac}
          shape="strip"
          width={width + 0.04}
          thickness={0.045}
          depth={depth + 0.04}
          position={[0, 0.28 + bodyHeight * tFrac, 0]}
          material={mats.trim}
        />
      ))}
      {/* Engaged facade columns on front + back. */}
      {[-0.42, -0.18, 0.18, 0.42].map((xFrac) => (
        <Column
          key={`front-${xFrac}`}
          height={bodyHeight * 0.9}
          radius={0.08}
          position={[width * xFrac, 0.28, depth / 2 - 0.06]}
          fluted
          fluteCount={8}
          capital
          base
          material={mats.accent}
        />
      ))}
      {[-0.42, -0.18, 0.18, 0.42].map((xFrac) => (
        <Column
          key={`back-${xFrac}`}
          height={bodyHeight * 0.9}
          radius={0.08}
          position={[width * xFrac, 0.28, -depth / 2 + 0.06]}
          fluted
          fluteCount={8}
          capital
          base
          material={mats.accent}
        />
      ))}
      {/* Arched windows row across the front facade. */}
      {[-0.32, 0, 0.32].map((xFrac) => (
        <Window
          key={xFrac}
          width={0.2}
          height={0.36}
          depth={0.07}
          position={[width * xFrac, 0.28 + bodyHeight * 0.6, depth / 2 + 0.025]}
          frameMaterial={mats.accent}
          glassMaterial={mats.glass}
        />
      ))}
      <PlasterBox
        width={width + 0.1}
        height={0.08}
        depth={depth + 0.1}
        position={[0, 0.28 + bodyHeight + 0.04, 0]}
        material={mats.stone}
      />
      <PlasterBox
        width={width * 0.7}
        height={0.1}
        depth={depth * 0.7}
        position={[0, 0.28 + bodyHeight + 0.14, 0]}
        material={mats.stone}
      />
      {/* Central monumental spire with finial. */}
      <Spire
        height={0.95}
        radius={0.11}
        position={[0, 0.28 + bodyHeight + 0.2, 0]}
        finialBall
        material={mats.roof}
        trimMaterial={mats.trim}
      />
      {/* 4 corner spire-towers. Each is a taller-than-body tapered
          cylinder + cone roof + flag — reads as castle-keep corner
          towers above the main roof. */}
      {(
        [
          [-width / 2 + 0.1, -depth / 2 + 0.1],
          [width / 2 - 0.1, -depth / 2 + 0.1],
          [-width / 2 + 0.1, depth / 2 - 0.1],
          [width / 2 - 0.1, depth / 2 - 0.1],
        ] as Array<[number, number]>
      ).map(([x, z]) => {
        const towerH = bodyHeight + 0.4;
        return (
          <group key={`tower-${x},${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.28 + towerH / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.12, 0.15, towerH, 12]} />
              <meshStandardMaterial {...mats.stone} />
            </mesh>
            {/* Gold band around top of each tower. */}
            <GoldTrim
              shape="ring"
              radius={0.125}
              thickness={0.02}
              position={[0, 0.28 + towerH - 0.04, 0]}
              material={mats.trim}
            />
            <ConeRoof
              radius={0.16}
              height={0.28}
              position={[0, 0.28 + towerH + 0.14, 0]}
              finial
              material={mats.roof}
              finialMaterial={mats.trim}
            />
            <Flag
              poleHeight={0.22}
              pennantLength={0.12}
              pennantHeight={0.08}
              position={[0, 0.28 + towerH + 0.34, 0]}
              poleMaterial={mats.dark}
              pennantMaterial={mats.banner}
            />
          </group>
        );
      })}
      {/* Huge faction banner cascading from the front eave. */}
      <Banner
        width={0.42}
        height={0.85}
        position={[0, 0.28 + bodyHeight - 0.04, depth / 2 + 0.05]}
        material={mats.banner}
      />
      {/* Flanking shields on side faces. */}
      <Shield
        shape="round"
        size={0.32}
        position={[-width / 2 - 0.03, 0.28 + bodyHeight / 2, 0]}
        rotationY={-Math.PI / 2}
        faceMaterial={mats.banner}
        bossMaterial={mats.trim}
      />
      <Shield
        shape="round"
        size={0.32}
        position={[width / 2 + 0.03, 0.28 + bodyHeight / 2, 0]}
        rotationY={Math.PI / 2}
        faceMaterial={mats.banner}
        bossMaterial={mats.trim}
      />
    </group>
  );
}
