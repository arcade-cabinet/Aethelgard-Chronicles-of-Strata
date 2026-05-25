/**
 * M_FUN.DYN.VOLCANO — visual baseline for the VolcanoLayer.
 *
 * Mounts the layer with a stub GameState that has:
 *   - a volcano at (0, 0)
 *   - 3 LAVA tiles in a ring around it (at varying opacities)
 *   - 4 fertile tiles further out
 * The captured PNG is the eyeball-review artifact: orange-red lava
 * discs near the magma cap, green fertile tint further out, all
 * legible against the obsidian background.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { getHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { VolcanoLayer } from '@/world/VolcanoLayer';

function makeStubGame(): GameState {
  const lavaTiles = new Map<string, number>();
  lavaTiles.set(getHexKey(1, 0), 28);
  lavaTiles.set(getHexKey(-1, 0), 18);
  lavaTiles.set(getHexKey(0, 1), 10);
  const fertileTiles = new Map<string, number>();
  for (const [q, r] of [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ] as const) {
    fertileTiles.set(getHexKey(q, r), 50);
  }
  return {
    volcano: {
      position: getHexKey(0, 0),
      cooldown: 60,
      lavaTiles,
      fertileTiles,
    },
  } as unknown as GameState;
}

describe('volcano layer harness', () => {
  it('renders magma cap, lava discs, and fertile tints', async () => {
    await render(
      <div style={{ width: 320, height: 320 }}>
        <Canvas camera={{ position: [0, 7, 5], fov: 50 }} style={{ background: '#0f172a' }}>
          <ambientLight intensity={0.45} />
          <directionalLight position={[5, 8, 3]} intensity={1.1} />
          <VolcanoLayer game={makeStubGame()} />
        </Canvas>
      </div>,
    );
    await new Promise((r) => setTimeout(r, 300));
    const path = await page.screenshot({
      path: '__screenshots__/volcano-layer.png',
    });
    expect(path).toBeTruthy();
  });
});
