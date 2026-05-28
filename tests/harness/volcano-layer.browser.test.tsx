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
 *
 * M_FUN.TEST.VOLCANO-LAYER — replaced the flaky `setTimeout(300)` +
 * vacuous `path.toBeTruthy()` with:
 *   1. `vi.waitFor` on canvas DOM presence (deterministic mount gate).
 *   2. 60ms flush (1-2 rAF) for r3f to commit the first paint.
 *   3. Spec-derived paint assertion: `canvas.toDataURL()` on a WebGL
 *      canvas triggers readPixels internally and returns a base64 PNG.
 *      A blank/black frame encodes to ~600 chars; orange-red lava discs
 *      produce significantly more color data (> 4000 chars). This approach
 *      works on WebGL canvases where `getContext('2d')` returns null.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { getHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { VolcanoLayer } from '@/world/effects';

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
    // Deterministic mount gate: wait for canvas DOM presence.
    await vi.waitFor(
      () => {
        const c = document.querySelector('canvas');
        if (!c) throw new Error('volcano-layer: canvas not in DOM');
      },
      { timeout: 5000, interval: 30 },
    );
    // 60ms flush (≈1-2 rAF) for r3f to commit the first paint.
    await new Promise((r) => setTimeout(r, 60));
    // Capture screenshot for eyeball review.
    await page.screenshot({ path: '__screenshots__/volcano-layer.png' });
    // Spec: "orange-red lava discs" — use toDataURL() on the WebGL canvas.
    // A blank/black frame encodes to ~600 chars; orange-red lava discs + the
    // magma cap produce significantly more color data (> 4000 chars).
    // Note: getContext('2d') returns null on a WebGL canvas — toDataURL()
    // triggers readPixels internally and works correctly.
    const dataUrl = await vi.waitFor(
      () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('canvas missing after paint');
        const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
        if (url.length < 1000) throw new Error('canvas not yet painted (blank frame)');
        return url;
      },
      { timeout: 3000, interval: 50 },
    );
    expect(
      dataUrl.length,
      'volcano-layer canvas should have color content (lava discs + magma cap produce > 4000 chars)',
    ).toBeGreaterThan(4000);
  });
});
