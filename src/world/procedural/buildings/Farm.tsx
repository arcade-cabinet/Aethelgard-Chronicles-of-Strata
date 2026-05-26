/**
 * M_V11.PROCMESH.BUILDINGS — Farm (small civic).
 *
 * Source-unit bbox: width 0.9, depth 0.9, height ~0.7.
 * Hex-fit scale: 1.0.
 *
 * Composition: short stone plinth + low wood body + pitched roof +
 * chimney + door + small window. Reads as 'small homestead'.
 */
import { Chimney, Door, PitchedRoof, StonePlinth, Window } from '../primitives';
import { useFactionMaterials } from '../FactionMaterialsContext';

export function Farm({
  width = 0.9,
  depth = 0.9,
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
        width={width + 0.1}
        length={depth + 0.1}
        ridgeHeight={0.28}
        position={[0, 0.06 + bodyHeight + 0.02, 0]}
        material={mats.roof}
      />
      <Chimney
        width={0.1}
        height={0.32}
        depth={0.1}
        position={[width / 3, 0.06 + bodyHeight, depth / 4]}
        material={mats.stone}
        capMaterial={mats.dark}
      />
      <Door
        width={0.18}
        height={0.3}
        position={[0, 0.06 + 0.15, depth / 2 + 0.03]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
      <Window
        width={0.14}
        height={0.14}
        position={[width / 3, 0.06 + bodyHeight * 0.7, depth / 2 + 0.03]}
        frameMaterial={mats.wood}
        glassMaterial={mats.glass}
      />
    </group>
  );
}
