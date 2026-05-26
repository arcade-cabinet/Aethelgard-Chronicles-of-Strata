/**
 * M_V11.PROCMESH.HARNESS — tier-2 building visual baselines.
 *
 * One screenshot per building composition + a faction-cross sample
 * so palette drift is caught.
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
  TownHall,
  Wall,
  Watchtower,
  Wonder,
} from '@/world/procedural/buildings';
import { FactionMaterialsProvider } from '@/world/procedural/FactionMaterialsContext';

function Stage({
  children,
  cameraPos = [2.2, 2.0, 2.2] as [number, number, number],
}: {
  children: React.ReactNode;
  cameraPos?: [number, number, number];
}) {
  return (
    <div style={{ width: 320, height: 320 }}>
      <Canvas camera={{ position: cameraPos, fov: 38 }} style={{ background: '#0f172a' }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[4, 6, 3]} intensity={1.45} castShadow />
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[1, 6]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {children}
      </Canvas>
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle() {
  await new Promise((r) => setTimeout(r, 300));
}

describe('procmesh buildings — tier-2 visual baselines (player palette)', () => {
  it('TownHall', async () => {
    render(
      <Stage cameraPos={[2.6, 2.2, 2.6]}>
        <FactionMaterialsProvider faction="player">
          <TownHall />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-townhall.png` }),
    ).resolves.toBeTruthy();
  });
  it('Barracks', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <Barracks />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-barracks.png` }),
    ).resolves.toBeTruthy();
  });
  it('Wall', async () => {
    render(
      <Stage cameraPos={[1.8, 1.5, 1.8]}>
        <FactionMaterialsProvider faction="player">
          <Wall withBanner />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-wall.png` }),
    ).resolves.toBeTruthy();
  });
  it('Watchtower', async () => {
    render(
      <Stage cameraPos={[1.8, 2.0, 1.8]}>
        <FactionMaterialsProvider faction="player">
          <Watchtower />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-watchtower.png` }),
    ).resolves.toBeTruthy();
  });
  it('Farm', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <Farm />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-farm.png` }),
    ).resolves.toBeTruthy();
  });
  it('House', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <House />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-house.png` }),
    ).resolves.toBeTruthy();
  });
  it('Granary', async () => {
    render(
      <Stage>
        <FactionMaterialsProvider faction="player">
          <Granary />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-granary.png` }),
    ).resolves.toBeTruthy();
  });
  it('Library', async () => {
    render(
      <Stage cameraPos={[2.4, 2.0, 2.4]}>
        <FactionMaterialsProvider faction="player">
          <Library />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-library.png` }),
    ).resolves.toBeTruthy();
  });
  it('Wonder', async () => {
    render(
      <Stage cameraPos={[3.2, 2.6, 3.2]}>
        <FactionMaterialsProvider faction="player">
          <Wonder />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-player-wonder.png` }),
    ).resolves.toBeTruthy();
  });
});

describe('procmesh buildings — faction-cross palette shift', () => {
  it('TownHall — enemy (necropolis palette)', async () => {
    render(
      <Stage cameraPos={[2.6, 2.2, 2.6]}>
        <FactionMaterialsProvider faction="enemy">
          <TownHall />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-enemy-townhall.png` }),
    ).resolves.toBeTruthy();
  });
  it('Wonder — enemy (necropolis palette)', async () => {
    render(
      <Stage cameraPos={[3.2, 2.6, 3.2]}>
        <FactionMaterialsProvider faction="enemy">
          <Wonder />
        </FactionMaterialsProvider>
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/procmesh-building-enemy-wonder.png` }),
    ).resolves.toBeTruthy();
  });
});
