/**
 * M_V11.PROCMESH.BUILDINGS — Barracks.
 *
 * Source-unit bbox (default args): width 1.1, depth 1.0, height ~0.9.
 * Hex-fit scale: 1.0.
 *
 * Composition: stone plinth + 4 wood corner posts + plank walls (boxes)
 * + pitched roof + door on front + weapon rack on side + banner on
 * facade.
 */
import {
  Banner,
  Battlement,
  Door,
  PitchedRoof,
  StonePlinth,
  WeaponRack,
  Window,
  WoodPost,
} from '../primitives';
import { useFactionMaterials } from '../faction-materials';

export function Barracks({
  width = 1.1,
  depth = 1.0,
  bodyHeight = 0.55,
  position = [0, 0, 0],
}: {
  width?: number;
  depth?: number;
  bodyHeight?: number;
  position?: [number, number, number];
}) {
  const mats = useFactionMaterials();
  const wallThickness = 0.06;
  return (
    <group position={position}>
      <StonePlinth
        width={width + 0.08}
        depth={depth + 0.08}
        height={0.08}
        position={[0, 0.04, 0]}
        material={mats.stone}
      />
      {/* corner posts */}
      {([
        [-width / 2, depth / 2],
        [width / 2, depth / 2],
        [-width / 2, -depth / 2],
        [width / 2, -depth / 2],
      ] as Array<[number, number]>).map(([x, z], i) => (
        <WoodPost
          key={i}
          height={bodyHeight}
          width={0.08}
          depth={0.08}
          position={[x, 0.08 + bodyHeight / 2, z]}
          material={mats.wood}
        />
      ))}
      {/* four wall planes (planks) */}
      <mesh position={[0, 0.08 + bodyHeight / 2, depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyHeight, wallThickness]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      <mesh position={[0, 0.08 + bodyHeight / 2, -depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[width, bodyHeight, wallThickness]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      <mesh position={[width / 2, 0.08 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, bodyHeight, depth]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      <mesh position={[-width / 2, 0.08 + bodyHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, bodyHeight, depth]} />
        <meshStandardMaterial {...mats.wood} />
      </mesh>
      {/* roof */}
      <PitchedRoof
        width={width + 0.12}
        length={depth + 0.12}
        ridgeHeight={0.32}
        position={[0, 0.08 + bodyHeight + 0.02, 0]}
        material={mats.roof}
      />
      {/* door on +Z face */}
      <Door
        width={0.22}
        height={0.36}
        depth={0.05}
        position={[0, 0.08 + 0.18, depth / 2 + 0.03]}
        panelMaterial={mats.wood}
        frameMaterial={mats.dark}
        handleMaterial={mats.trim}
      />
      {/* windows flanking the door */}
      <Window
        width={0.16}
        height={0.18}
        depth={0.05}
        position={[-width / 3, 0.08 + bodyHeight * 0.7, depth / 2 + 0.03]}
        frameMaterial={mats.wood}
        glassMaterial={mats.glass}
      />
      <Window
        width={0.16}
        height={0.18}
        depth={0.05}
        position={[width / 3, 0.08 + bodyHeight * 0.7, depth / 2 + 0.03]}
        frameMaterial={mats.wood}
        glassMaterial={mats.glass}
      />
      {/* banner above the door */}
      <Banner
        width={0.26}
        height={0.4}
        position={[0, 0.08 + bodyHeight + 0.05, depth / 2 + 0.04]}
        material={mats.banner}
      />
      {/* weapon rack on +X side */}
      <WeaponRack
        width={0.45}
        height={0.5}
        weaponCount={5}
        position={[width / 2 + 0.12, 0.08, 0]}
        rotationY={Math.PI / 2}
        rackMaterial={mats.wood}
        weaponMaterial={mats.metal}
        shaftMaterial={mats.wood}
      />
      {/* row of battlement teeth above the roof ridge — military read */}
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <Battlement
          key={x}
          width={0.1}
          height={0.12}
          depth={0.1}
          position={[x, 0.08 + bodyHeight + 0.4, 0]}
          material={mats.stone}
        />
      ))}
    </group>
  );
}
