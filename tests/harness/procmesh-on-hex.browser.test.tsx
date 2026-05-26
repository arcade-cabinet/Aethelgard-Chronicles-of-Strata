/**
 * M_V11.POLISH.PROCMESH.ON-HEX — building-on-tile composite baselines.
 *
 * Per-building harnesses screenshot each building in isolation at a
 * flattering 3/4 camera. That tells us the silhouette is right but
 * NOT how the building reads on the actual game hex board at the
 * actual game camera. This file fills that gap.
 *
 * A regular flat hex baseplate at HEX_RADIUS=1, the building placed
 * on top with no scale change, viewed from the game's default camera
 * angle (45° tilt, looking down at the centre tile).
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Barracks,
  Farm,
  Granary,
  House,
  Library,
  Palace,
  Wall,
  Watchtower,
  Wonder,
} from '@/world/procedural/buildings';
import { FactionMaterialsProvider } from '@/world/procedural/FactionMaterialsContext';

/** Single flat hex tile + the building sitting on it, viewed from the
 *  game-board camera angle. */
function HexStage({
  children,
  // tighter cam for smaller buildings; pulled back for Wonder/Palace.
  cameraDist = 4.2,
}: {
  children: React.ReactNode;
  cameraDist?: number;
}) {
  return (
    <div style={{ width: 360, height: 360 }}>
      <Canvas
        camera={{ position: [cameraDist * 0.65, cameraDist * 0.7, cameraDist * 0.65], fov: 38 }}
        style={{ background: '#0f172a' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 7, 3]} intensity={1.5} castShadow />
        {/* hex tile baseplate — radius matches HEX_RADIUS=1 */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1, 6]} />
          <meshStandardMaterial color="#3d6b3d" roughness={0.95} />
        </mesh>
        {/* slight rim so the tile reads as a tile */}
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[0.98, 1.0, 6]} />
          <meshStandardMaterial color="#2a4a2a" roughness={0.95} />
        </mesh>
        {children}
      </Canvas>
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle() {
  await new Promise((r) => setTimeout(r, 600));
}

describe('procmesh on-hex composite — buildings at game-camera scale', () => {
  // Per-building per-tile scale + camera-distance tuning. The hex tile
  // has radius 1; small buildings scale to ~0.9× of footprint, large
  // ones scale down so they fit visually on one tile.
  const BUILDINGS = [
    ['palace', Palace, 0.85, 4.2],
    ['house', House, 1.05, 3.6],
    ['barracks', Barracks, 0.95, 4.0],
    ['farm', Farm, 0.9, 4.4],
    ['granary', Granary, 1.1, 3.6],
    ['library', Library, 0.9, 4.0],
    ['watchtower', Watchtower, 1.1, 4.0],
    ['wonder', Wonder, 0.6, 5.0],
  ] as const;
  for (const [name, Component, scale, dist] of BUILDINGS) {
    it(`${name} on hex tile (player palette)`, async () => {
      render(
        <HexStage cameraDist={dist}>
          <FactionMaterialsProvider faction="player">
            <group scale={scale}>
              <Component />
            </group>
          </FactionMaterialsProvider>
        </HexStage>,
      );
      await settle();
      await expect(
        page.screenshot({
          path: `${baselineDir}/procmesh-on-hex-${name}-player.png`,
        }),
      ).resolves.toBeTruthy();
    });
  }
  it('Wall on hex tile (player palette)', async () => {
    render(
      <HexStage cameraDist={3.8}>
        <FactionMaterialsProvider faction="player">
          <Wall hasGate withBanner />
        </FactionMaterialsProvider>
      </HexStage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-on-hex-wall-player.png` }),
    ).resolves.toBeTruthy();
  });
});

describe('procmesh on-hex composite — enemy palette spot-check', () => {
  it('Wonder on hex tile (enemy palette)', async () => {
    render(
      <HexStage cameraDist={5.0}>
        <FactionMaterialsProvider faction="enemy">
          <group scale={0.6}>
            <Wonder />
          </group>
        </FactionMaterialsProvider>
      </HexStage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-on-hex-wonder-enemy.png` }),
    ).resolves.toBeTruthy();
  });
  it('Watchtower on hex tile (enemy palette)', async () => {
    render(
      <HexStage cameraDist={4.0}>
        <FactionMaterialsProvider faction="enemy">
          <group scale={1.1}>
            <Watchtower />
          </group>
        </FactionMaterialsProvider>
      </HexStage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-on-hex-watchtower-enemy.png` }),
    ).resolves.toBeTruthy();
  });
});
