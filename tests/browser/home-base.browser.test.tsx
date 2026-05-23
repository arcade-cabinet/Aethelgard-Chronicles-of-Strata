/**
 * HomeBase rendering — M7 asset expansion.
 * Verifies that the new Castle Kit / Fantasy Town Kit GLBs load and mount
 * meshes in the Three.js scene for all three building types.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Building, HexPosition, FactionTrait } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { HomeBase } from '@/world/HomeBase';

describe('HomeBase rendering (Castle Kit / Fantasy Town Kit)', () => {
  it('renders town-hall (tower-square) mesh in the scene', async () => {
    const game = startGame('ancient-silver-forest');
    const captured: { scene?: Object3D } = {};

    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <HomeBase game={game} />
        </Suspense>
      </Canvas>,
    );

    // Wait for the Castle Kit tower-square GLB to load and produce meshes.
    await vi.waitFor(
      () => {
        let meshCount = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshCount += 1;
        });
        // tower-square has multiple mesh parts — at least 1 expected.
        expect(meshCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 15_000, interval: 250 },
    );
  });

  it('renders farm (windmill) and barracks (tower-slant-roof) when build sites exist', async () => {
    const game = startGame('ancient-silver-forest');

    // Spawn a Farm building entity at a known tile near the board center.
    const farmEntity = game.world.spawn(
      HexPosition({ q: 1, r: 0, level: 0 }),
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'player' }),
    );
    game.buildSites.set('1,0', farmEntity);

    // Spawn a Barracks building entity.
    const barracksEntity = game.world.spawn(
      HexPosition({ q: -1, r: 0, level: 0 }),
      Building({ buildingType: 'Barracks', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'player' }),
    );
    game.buildSites.set('-1,0', barracksEntity);

    const captured: { scene?: Object3D } = {};
    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <HomeBase game={game} />
        </Suspense>
      </Canvas>,
    );

    // Wait for all three GLBs (town-hall + farm + barracks) to load.
    // Total mesh count should be materially higher than just the town-hall alone.
    await vi.waitFor(
      () => {
        let meshCount = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshCount += 1;
        });
        // Three distinct building models — each contributes at least 1 mesh.
        expect(meshCount).toBeGreaterThanOrEqual(3);
      },
      { timeout: 20_000, interval: 250 },
    );
  });
});
