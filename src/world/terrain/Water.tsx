import { HEX_RADIUS, TILE_HEIGHT, WATER_LEVEL, WORLD } from '@/config/world';

/**
 * The ocean — two translucent hex discs at the water line plus an opaque
 * sea-floor disc below the board. The double water layer (offset slightly,
 * differing opacity) gives the surface a little depth. Mirrors poc1's water.
 */
export function Water({ mapRadius }: { mapRadius: number }) {
  const waterR = mapRadius * HEX_RADIUS * 1.7;
  const floorR = mapRadius * HEX_RADIUS * 1.8;
  return (
    <group name="water">
      {/* lower water layer */}
      <mesh position={[0, WATER_LEVEL, 0]} rotation={[0, Math.PI / 6, 0]}>
        <cylinderGeometry args={[waterR, waterR, WORLD.hex.waterDiscHeight, 6]} />
        <meshStandardMaterial
          color="#0ea5e9"
          transparent
          opacity={0.6}
          roughness={0.1}
          flatShading
        />
      </mesh>
      {/* upper water layer — slightly smaller and higher for a layered sheen */}
      <mesh
        position={[0, WATER_LEVEL + 0.05, 0]}
        rotation={[0, Math.PI / 6, 0]}
        scale={[0.98, 1, 0.98]}
      >
        <cylinderGeometry args={[waterR, waterR, WORLD.hex.waterDiscHeight, 6]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.4}
          roughness={0.2}
          flatShading
        />
      </mesh>
      {/* opaque sea floor */}
      <mesh position={[0, -TILE_HEIGHT * 1.2, 0]} rotation={[0, Math.PI / 6, 0]} receiveShadow>
        <cylinderGeometry args={[floorR, floorR, 1, 6]} />
        <meshStandardMaterial color="#075985" flatShading />
      </mesh>
    </group>
  );
}
