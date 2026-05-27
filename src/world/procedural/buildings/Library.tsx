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
import {
  Column,
  Door,
  Flag,
  GoldTrim,
  Lantern,
  PlasterBox,
  Spire,
  StonePlinth,
  Window,
} from '../primitives';
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
      <PlasterBox
        width={width}
        height={bodyHeight}
        depth={depth}
        position={[0, 0.1 + bodyHeight / 2, 0]}
        material={mats.stone}
      />
      <PlasterBox
        width={width + 0.08}
        height={0.06}
        depth={depth + 0.08}
        position={[0, 0.1 + bodyHeight + 0.03, 0]}
        material={mats.stone}
      />
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
      {/* Engaged facade columns — half-columns embedded into the +Z
          face. 6 columns spaced evenly across the width minus margins.
          Position: at depth/2 - columnRadius so half the column reads
          as architectural and the rest is buried in the wall. */}
      {(() => {
        const margin = 0.08;
        const usableWidth = width - margin * 2;
        const columnCount = 6;
        const columnRadius = 0.055;
        const step = usableWidth / (columnCount - 1);
        return Array.from({ length: columnCount }, (_, i) => {
          const x = -usableWidth / 2 + step * i;
          return (
            <Column
              key={`col-${x.toFixed(3)}`}
              height={bodyHeight}
              radius={columnRadius}
              position={[x, 0.1, depth / 2 - columnRadius * 0.4]}
              fluted
              fluteCount={6}
              capital
              base
              material={mats.accent}
            />
          );
        });
      })()}
      {/* Two lanterns flanking the door — emissive glow reads at
          game-camera distance even in shadow. */}
      <Lantern
        size={0.05}
        bracketLength={0.07}
        position={[-0.22, 0.1 + 0.32, depth / 2 + 0.03]}
        bracketMaterial={mats.dark}
      />
      <Lantern
        size={0.05}
        bracketLength={0.07}
        position={[0.22, 0.1 + 0.32, depth / 2 + 0.03]}
        bracketMaterial={mats.dark}
      />
      {/* Flag from the cupola apex. */}
      <Flag
        poleHeight={0.22}
        pennantLength={0.12}
        pennantHeight={0.08}
        position={[0, 0.1 + bodyHeight + 0.4, 0]}
        poleMaterial={mats.dark}
        pennantMaterial={mats.banner}
      />
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
