/**
 * M_V11.PROCMESH.BUILDINGS — House (civic dwelling).
 *
 * Source-unit bbox: width 0.85, depth 0.85, height ~0.85 (incl roof).
 * Hex-fit scale: 1.0.
 *
 * Slightly taller and narrower than the Farm; reads as 'civic
 * dwelling' rather than 'barn'. Composition: stone plinth + plaster
 * body (stone material with brighter accent inset) + pitched roof +
 * chimney + door + two upper windows.
 */
import { Chimney, Door, PitchedRoof, StonePlinth, Window } from '../primitives';
import { useFactionMaterials } from '../FactionMaterialsContext';

export function House({
  width = 0.85,
  depth = 0.85,
  bodyHeight = 0.55,
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
        <meshStandardMaterial {...mats.stone} />
      </mesh>
      {/* exposed timber framing (X-brace on +Z face) */}
      <mesh
        position={[0, 0.06 + bodyHeight * 0.5, depth / 2 + 0.005]}
        rotation={[0, 0, Math.PI / 5]}
        castShadow
      >
        <boxGeometry args={[width * 1.1, 0.04, 0.02]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      <mesh
        position={[0, 0.06 + bodyHeight * 0.5, depth / 2 + 0.005]}
        rotation={[0, 0, -Math.PI / 5]}
        castShadow
      >
        <boxGeometry args={[width * 1.1, 0.04, 0.02]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      <PitchedRoof
        width={width + 0.1}
        length={depth + 0.1}
        ridgeHeight={0.3}
        position={[0, 0.06 + bodyHeight + 0.02, 0]}
        material={mats.roof}
      />
      <Chimney
        width={0.1}
        height={0.36}
        depth={0.1}
        position={[width / 3, 0.06 + bodyHeight, -depth / 4]}
        material={mats.stone}
        capMaterial={mats.dark}
      />
      <Door
        width={0.2}
        height={0.36}
        position={[0, 0.06 + 0.18, depth / 2 + 0.03]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
      <Window
        width={0.14}
        height={0.16}
        position={[-width / 3, 0.06 + bodyHeight * 0.75, depth / 2 + 0.03]}
        frameMaterial={mats.wood}
        glassMaterial={mats.glass}
      />
      <Window
        width={0.14}
        height={0.16}
        position={[width / 3, 0.06 + bodyHeight * 0.75, depth / 2 + 0.03]}
        frameMaterial={mats.wood}
        glassMaterial={mats.glass}
      />
    </group>
  );
}
