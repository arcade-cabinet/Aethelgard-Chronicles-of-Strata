/**
 * M_V11.PROCMESH.BUILDINGS — Wonder (final game-changer building).
 *
 * Source-unit bbox: width 1.6, depth 1.6, height ~2.2 (incl spire).
 * Hex-fit scale: 1.0 (intentionally oversized — Wonder uses
 *   factionMaterials + a per-faction buildingScale override of ~1.6×
 *   on top of the tile bbox; the composition is already scaled here).
 *
 * Composition: multi-tier stone plinth + 8 facade columns + stone body
 * with arched window inset + tall spire with finial + 4 corner battlement
 * towers + grand banner ramp + flanking shields + gold trim every tier.
 *
 * The 'imposing keep' silhouette. Carries the most banner+trim+spire of
 * any building so faction identity is unmistakable at zoom-out.
 */
import {
  Banner,
  BattlementRow,
  Column,
  GoldTrim,
  PitchedRoof,
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
      {/* 3-tier plinth */}
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
      {/* main body */}
      <mesh position={[0, 0.28 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyHeight, depth]} />
        <meshStandardMaterial {...mats.stone} />
      </mesh>
      {/* gold trim — bottom + middle + top of body */}
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
      {/* 8 facade columns (4 on each long side) */}
      {[-0.42, -0.18, 0.18, 0.42].map((xFrac) => (
        <Column
          key={`front-${xFrac}`}
          height={bodyHeight * 0.9}
          radius={0.08}
          position={[width * xFrac, 0.28, depth / 2 - 0.04]}
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
          position={[width * xFrac, 0.28, -depth / 2 + 0.04]}
          fluted
          fluteCount={8}
          capital
          base
          material={mats.accent}
        />
      ))}
      {/* arched windows row */}
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
      {/* pitched roof */}
      <PitchedRoof
        width={width + 0.2}
        length={depth + 0.2}
        ridgeHeight={0.5}
        position={[0, 0.28 + bodyHeight + 0.04, 0]}
        material={mats.roof}
      />
      {/* central spire */}
      <Spire
        height={0.75}
        radius={0.09}
        position={[0, 0.28 + bodyHeight + 0.62, 0]}
        finialBall
        material={mats.roof}
        trimMaterial={mats.trim}
      />
      {/* 4 corner battlement towers — short cylinders capped with
          battlement teeth */}
      {[
        [-width / 2 + 0.08, -depth / 2 + 0.08],
        [width / 2 - 0.08, -depth / 2 + 0.08],
        [-width / 2 + 0.08, depth / 2 - 0.08],
        [width / 2 - 0.08, depth / 2 - 0.08],
      ].map(([x, z], i) => (
        <group key={i}>
          <mesh
            position={[x as number, 0.28 + bodyHeight / 2, z as number]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.12, 0.13, bodyHeight + 0.15, 10]} />
            <meshStandardMaterial {...mats.stone} />
          </mesh>
          <BattlementRow
            count={6}
            length={0.22}
            blockWidth={0.06}
            blockHeight={0.08}
            blockDepth={0.06}
            position={[x as number, 0.28 + bodyHeight + 0.16, z as number]}
            material={mats.stone}
          />
        </group>
      ))}
      {/* huge faction banner cascading from the eave */}
      <Banner
        width={0.42}
        height={0.85}
        position={[0, 0.28 + bodyHeight - 0.04, depth / 2 + 0.05]}
        material={mats.banner}
      />
      {/* flanking shields on side faces */}
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
