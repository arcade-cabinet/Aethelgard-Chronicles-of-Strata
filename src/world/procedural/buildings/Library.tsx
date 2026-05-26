/**
 * M_V11.PROCMESH.BUILDINGS — Library.
 *
 * Source-unit bbox: width 1.05, depth 0.95, height ~1.0 (incl cupola).
 * Hex-fit scale: 1.0.
 *
 * Composition: stone plinth + 6 facade columns + stone body + flat
 * stone cap + central cupola (small spire) + tall arched windows on
 * sides + ornate door + gold trim band. Reads as 'classical learning'.
 */
import { Column, Door, GoldTrim, Spire, StonePlinth, Window } from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Library({
  width = 1.05,
  depth = 0.95,
  bodyHeight = 0.6,
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
        width={width + 0.16}
        depth={depth + 0.16}
        height={0.1}
        position={[0, 0.05, 0]}
        material={mats.stone}
      />
      <mesh position={[0, 0.1 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyHeight, depth]} />
        <meshStandardMaterial {...mats.stone} />
      </mesh>
      {/* flat roof slab */}
      <mesh position={[0, 0.1 + bodyHeight + 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.08, 0.06, depth + 0.08]} />
        <meshStandardMaterial {...mats.stone} />
      </mesh>
      {/* central cupola */}
      <Spire
        height={0.3}
        radius={0.1}
        position={[0, 0.1 + bodyHeight + 0.06, 0]}
        finialBall
        material={mats.roof}
        trimMaterial={mats.trim}
      />
      {/* gold trim band */}
      <GoldTrim
        shape="strip"
        width={width + 0.02}
        thickness={0.04}
        depth={depth + 0.02}
        position={[0, 0.1 + bodyHeight * 0.82, 0]}
        material={mats.trim}
      />
      {/* facade columns — 6 across +Z face */}
      {[-0.42, -0.25, -0.08, 0.08, 0.25, 0.42].map((x) => (
        <Column
          key={x}
          height={bodyHeight}
          radius={0.06}
          position={[x * (width / 0.5), 0.1, depth / 2 - 0.02]}
          fluted
          fluteCount={6}
          capital
          base
          material={mats.accent}
        />
      ))}
      {/* tall arched windows on side walls — represented as tall thin Windows */}
      {[-1, 1].map((sign) => (
        <Window
          key={sign}
          width={0.18}
          height={0.42}
          position={[(width / 2 + 0.005) * sign, 0.1 + bodyHeight * 0.55, 0]}
          rotationY={(Math.PI / 2) * sign}
          muntins={false}
          frameMaterial={mats.accent}
          glassMaterial={mats.glass}
        />
      ))}
      {/* central door */}
      <Door
        width={0.26}
        height={0.42}
        depth={0.06}
        position={[0, 0.1 + 0.22, depth / 2 + 0.025]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
    </group>
  );
}
