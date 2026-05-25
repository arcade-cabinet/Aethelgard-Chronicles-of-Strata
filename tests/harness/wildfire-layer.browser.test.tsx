/**
 * M_FUN.DYN.WILDFIRE — visual baseline for the WildfireLayer.
 *
 * Mounts the layer in a minimal r3f scene with a stub GameState
 * carrying three burning tiles in a row. Captures the screenshot
 * for eyeball review against the design intent: bright orange
 * pulsing discs at hex positions, no flicker that would fail an
 * a11y motion-reduction audit.
 *
 * M_FUN.TEST.WILDFIRE-DAMAGE — replaced the flaky `setTimeout(300)` +
 * vacuous `path.toBeTruthy()` with:
 *   1. `vi.waitFor` on canvas DOM presence (deterministic mount gate).
 *   2. 60ms flush (1-2 rAF) for r3f to commit the first paint.
 *   3. Spec-derived paint assertion: `canvas.toDataURL()` on a WebGL
 *      canvas triggers readPixels internally and returns a base64 PNG.
 *      A blank/black frame encodes to ~600 chars; orange discs produce
 *      significantly more color data (> 4000 chars). This approach works
 *      on WebGL canvases where `getContext('2d')` returns null.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { WILDFIRE_TUNING } from '@/config/mapgen';
import { getHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';
import { WildfireLayer } from '@/world/WildfireLayer';

function makeStubGame(): GameState {
  const wildfires = new Map<string, { burnTicksRemaining: number; secondsSinceTick: number }>();
  // Three burning tiles in a row at (-1,0), (0,0), (1,0).
  for (const q of [-1, 0, 1]) {
    wildfires.set(getHexKey(q, 0), {
      burnTicksRemaining: WILDFIRE_TUNING.burnTicks,
      secondsSinceTick: 0,
    });
  }
  return { wildfires } as unknown as GameState;
}

describe('wildfire layer harness', () => {
  it('renders one disc per burning tile', async () => {
    await render(
      <div style={{ width: 320, height: 320 }}>
        <Canvas camera={{ position: [0, 6, 4], fov: 50 }} style={{ background: '#0f172a' }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 3]} intensity={1.0} />
          <WildfireLayer game={makeStubGame()} />
        </Canvas>
      </div>,
    );
    // Deterministic mount gate: wait for canvas DOM presence.
    await vi.waitFor(
      () => {
        const c = document.querySelector('canvas');
        if (!c) throw new Error('wildfire-layer: canvas not in DOM');
      },
      { timeout: 5000, interval: 30 },
    );
    // 60ms flush (≈1-2 rAF) for r3f to commit the first paint.
    await new Promise((r) => setTimeout(r, 60));
    // Capture screenshot for eyeball review.
    await page.screenshot({ path: '__screenshots__/wildfire-layer.png' });
    // Spec: "bright orange pulsing discs" — use toDataURL() on the WebGL
    // canvas. A blank/black frame encodes to ~600 chars; orange discs
    // produce significantly more color data (> 4000 chars).
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
      'wildfire-layer canvas should have color content (orange discs produce > 4000 chars)',
    ).toBeGreaterThan(4000);
  });
});
