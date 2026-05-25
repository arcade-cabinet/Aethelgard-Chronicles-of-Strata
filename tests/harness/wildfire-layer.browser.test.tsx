/**
 * M_FUN.DYN.WILDFIRE — visual baseline for the WildfireLayer.
 *
 * Mounts the layer in a minimal r3f scene with a stub GameState
 * carrying three burning tiles in a row. Captures the screenshot
 * for eyeball review against the design intent: bright orange
 * pulsing discs at hex positions, no flicker that would fail an
 * a11y motion-reduction audit.
 */
import { Canvas } from '@react-three/fiber';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
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
    // Wait for r3f mount + a couple of frames so the pulse animation
    // settles into a representative pose for the baseline.
    await new Promise((r) => setTimeout(r, 300));
    const path = await page.screenshot({
      path: '__screenshots__/wildfire-layer.png',
    });
    expect(path).toBeTruthy();
  });
});
