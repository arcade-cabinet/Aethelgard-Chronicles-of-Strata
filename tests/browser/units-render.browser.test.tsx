import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createCharacter } from '@/entities/character-factory';
import { startGame } from '@/game/game-state';
import { Units } from '@/world/Units';

describe('Units rendering', () => {
  it('renders a skinned mesh for every spawned unit', async () => {
    // M_V11.OPEN.SPAWN — startGame no longer pre-spawns units.
    // Spawn 2 peons + 1 Footman explicitly to exercise the
    // Units render path with multiple character types loaded.
    const game = startGame('ancient-silver-forest');
    const [tq, tr] = game.palaceKey.split(',').map(Number) as [number, number];
    const tile = game.board.tiles.get(`${tq + 1},${tr}`);
    if (tile?.walkable) {
      createCharacter({
        world: game.world,
        role: 'Peon',
        q: tile.q,
        r: tile.r,
        level: tile.level,
      });
      createCharacter({
        world: game.world,
        role: 'Peon',
        q: tile.q,
        r: tile.r,
        level: tile.level,
      });
      createCharacter({
        world: game.world,
        role: 'Footman',
        q: tile.q,
        r: tile.r,
        level: tile.level,
      });
    }
    const captured: { scene?: Object3D } = {};
    render(
      <Canvas
        onCreated={(state) => {
          captured.scene = state.scene;
        }}
      >
        <Suspense fallback={null}>
          <Units game={game} />
        </Suspense>
      </Canvas>,
    );
    // wait for the 3 character GLBs to load and mount their skinned meshes
    await vi.waitFor(
      () => {
        let skinned = 0;
        captured.scene?.traverse((o) => {
          if ((o as { isSkinnedMesh?: boolean }).isSkinnedMesh) skinned += 1;
        });
        // each KayKit character has several skinned sub-meshes — at least 3 units
        expect(skinned).toBeGreaterThanOrEqual(3);
      },
      { timeout: 15_000, interval: 250 },
    );
  });
});
