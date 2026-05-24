/**
 * FactionBase rendering — M_REGISTRY.4 unified base renderer (was
 * the HomeBase + EnemyBase split). Verifies that the unified component
 * loads the per-faction Skin assets and mounts meshes in the Three.js
 * scene for both factions, including placed structures and decorative
 * baseProps (Skin slot, M_REGISTRY.4).
 */
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Building, FactionTrait, HexPosition } from '@/ecs/components';
import { startGame } from '@/game/game-state';
import { FactionBase } from '@/world/FactionBase';

describe('FactionBase rendering (M_REGISTRY.4 unified)', () => {
  it('renders player base (TownHall — Castle Kit tower-square)', async () => {
    const game = startGame('ancient-silver-forest');
    const captured: { scene?: Object3D } = {};

    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <FactionBase game={game} faction="player" />
        </Suspense>
      </Canvas>,
    );

    await vi.waitFor(
      () => {
        let meshCount = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshCount += 1;
        });
        expect(meshCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 15_000, interval: 250 },
    );
  });

  it('renders player base with placed Farm + Barracks structures', async () => {
    const game = startGame('ancient-silver-forest');

    const farmEntity = game.world.spawn(
      HexPosition({ q: 1, r: 0, level: 0 }),
      Building({ buildingType: 'Farm', isComplete: true, progress: 1 }),
      FactionTrait({ faction: 'player' }),
    );
    game.buildSites.set('1,0', farmEntity);

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
          <FactionBase game={game} faction="player" />
        </Suspense>
      </Canvas>,
    );

    await vi.waitFor(
      () => {
        let meshCount = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshCount += 1;
        });
        expect(meshCount).toBeGreaterThanOrEqual(3);
      },
      { timeout: 20_000, interval: 250 },
    );
  });

  it('renders enemy base (crypt + necropolis baseProps from Skin slot)', async () => {
    const game = startGame('ancient-silver-forest');
    const captured: { scene?: Object3D } = {};

    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <FactionBase game={game} faction="enemy" />
        </Suspense>
      </Canvas>,
    );

    // CodeRabbit follow-up: assert spec-level behavior (FactionBase
    // mounts AND renders at least one mesh) rather than coupling to
    // the SKINS.baseProps count. Edits to the art slots — adding a
    // 4th gravestone or removing a fence — shouldn't fail CI when
    // the contract (the base renders meshes) is intact.
    await vi.waitFor(
      () => {
        let meshCount = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isMesh?: boolean }).isMesh) meshCount += 1;
        });
        expect(meshCount).toBeGreaterThanOrEqual(1);
      },
      { timeout: 20_000, interval: 250 },
    );
  });
});
